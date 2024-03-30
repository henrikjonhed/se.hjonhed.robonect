import { IRequestOptions, RestClient, IRestResponse } from "typed-rest-client";
import { BasicCredentialHandler } from "typed-rest-client/Handlers";
import { StatusResponse } from "./StatusResponse";
import { Mode } from "./Mode";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotReachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotReachableError";
  }
}

export class UnparseableResponseError extends Error {
  response: unknown;
  constructor(message: string, response: unknown) {
    super(message);
    this.name = "UnparseableResponseError";
    this.response = response;
  }
}

interface CommandResponse {
  successful: boolean;
}

export class RobonectClient {
  private basicAuthHandler: BasicCredentialHandler;
  private client: RestClient;

  constructor(address: string, username: string, password: string) {
    this.basicAuthHandler = new BasicCredentialHandler(username, password);
    this.client = new RestClient(
      "se.hjonhed.robonect",
      `http://${address}/json`,
      [this.basicAuthHandler],
    );
  }

  async getStatus(): Promise<StatusResponse> {
    return this.client
      .get<StatusResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "status",
          },
        },
      })
      .catch((err) => {
        if (
          err &&
          (err.code === "ECONNREFUSED" ||
            err.code === "ECONNRESET" ||
            err.code === "EHOSTUNREACH" ||
            err.code === "ETIMEDOUT")
        ) {
          throw new NotReachableError("Could not reach Robonect");
        }
        if (err && err.statusCode == 401) {
          throw new AuthorizationError(
            "Unauthorized, wrong username or password",
          );
        }
        if (
          err &&
          (err.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
            err.code === "CERT_HAS_EXPIRED")
        ) {
          throw new NotReachableError(
            "Could not reach Robonect, certificate error",
          );
        }
        if (err && err.message && err.message.includes("Request timeout")) {
          throw new NotReachableError("Could not reach Robonect, timeout");
        }
        throw err;
      })
      .then((response: IRestResponse<StatusResponse>) => {
        if (response.statusCode === 401) {
          throw new AuthorizationError(
            "Unauthorized, wrong username or password",
          );
        } else if (response.statusCode !== 200) {
          throw new Error(
            "Could not read data from Robonect, status code: " +
              response.statusCode,
          );
        }
        if (!response.result) {
          throw new UnparseableResponseError(
            "Unable to read data from Robonect",
            response,
          );
        }
        return response.result!;
      });
  }

  async setMode(mode: Mode): Promise<void> {
    const modes: { [key in Mode]: string } = {
      [Mode.auto]: "auto",
      [Mode.manual]: "man",
      [Mode.home]: "home",
      [Mode.end_of_day]: "eod",
    };
    const newMode = modes[mode];

    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "mode",
            mode: newMode,
          },
        },
      })
      .then((response: IRestResponse<CommandResponse>) => {
        if (!response.result?.successful) {
          throw new Error("Could not set mode");
        }
      });
  }

  async startNewJob(length_in_minutes: number): Promise<void> {
    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "mode",
            mode: "job",
            remote_start: 0,
            duration: length_in_minutes,
          },
        },
      })
      .then((response: IRestResponse<CommandResponse>) => {
        if (!response.result?.successful) {
          throw new Error("Could not start job");
        }
      });
  }
}
