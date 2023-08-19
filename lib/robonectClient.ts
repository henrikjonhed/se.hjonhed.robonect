import { IRequestOptions, RestClient, IRestResponse } from "typed-rest-client";
import { BasicCredentialHandler } from "typed-rest-client/Handlers";

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
  response: any;
  constructor(message: string, response: any) {
    super(message);
    this.name = "UnparseableResponseError";
    this.response = response;
  }
}

export interface TimerResponse {
  status: number; // 0: disabled, 1: active, 2: standby
  next: {
    date: string;
    time: string;
    unix: number;
  };
}

export interface StatusResponse {
  name: string;
  id: string;
  status: {
    status: number;
    distance: number; // meter?
    stopped: boolean;
    duration: number; // seconds in this mode
    mode: number;
    battery: number; // percent
    hours: number; // total mowing time in hours
  };
  timer: TimerResponse;
  blades?: {
    quality: number; // percent
    hours: number;
    days: number;
  };
  wlan: {
    signal: number; // rssi
  };
  health: {
    temperature: number;
    humidity: number;
  };
  error?: {
    error_code: number;
    error_message: string;
    date: string;
    time: string;
  };
  successful: boolean;
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
      [this.basicAuthHandler]
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
            "Unauthorized, wrong username or password"
          );
        }
        if (
          err &&
          (err.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
            err.code === "CERT_HAS_EXPIRED")
        ) {
          throw new NotReachableError(
            "Could not reach Robonect, certificate error"
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
            "Unauthorized, wrong username or password"
          );
        } else if (response.statusCode !== 200) {
          throw new Error(
            "Could not read data from Robonect, status code: " +
              response.statusCode
          );
        }
        if (!response.result) {
          throw new UnparseableResponseError(
            "Unable to read data from Robonect",
            response
          );
        }
        return response.result!!;
      });
  }

  async setMode(mode: number): Promise<void> {
    const modes: { [key: number]: string } = {
      0: "auto",
      1: "man",
      2: "home",
      3: "eod",
    };
    const newMode = modes[mode] || "unknown";

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
