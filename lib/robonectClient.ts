import { IRequestOptions, RestClient } from "typed-rest-client";
import { BasicCredentialHandler } from "typed-rest-client/Handlers";
import Ajv, { ValidateFunction } from "ajv";
import * as RobonectSchema from "./gen/robonectSchema.json";
import { StatusResponse } from "./StatusResponse";
import { Mode } from "./Mode";
import { UnparseableResponseError } from "./UnparseableResponseError";
import { handleAuthorizationError } from "./handleAuthorizationError";
import { handleNotReachableError } from "./handleNotReachableError";
import { resultFromResponse } from "./resultFromResponse";

interface CommandResponse {
  successful: boolean;
}

export class RobonectClient {
  private basicAuthHandler: BasicCredentialHandler;
  private client: RestClient;
  private ajv: Ajv;
  private statusResponseValidator: ValidateFunction<StatusResponse>;

  constructor(address: string, username: string, password: string) {
    this.basicAuthHandler = new BasicCredentialHandler(username, password);
    this.client = new RestClient(
      "se.hjonhed.robonect",
      `http://${address}/json`,
      [this.basicAuthHandler],
    );
    this.ajv = new Ajv();
    this.statusResponseValidator =
      this.ajv.compile<StatusResponse>(RobonectSchema);
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
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: StatusResponse) => {
        if (!this.statusResponseValidator(result)) {
          throw new UnparseableResponseError(
            "Unable to parse data from Robonect",
            result,
          );
        }
        return result;
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
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: CommandResponse) => {
        if (!result.successful) {
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
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: CommandResponse) => {
        if (!result.successful) {
          throw new Error("Could not start job");
        }
      });
  }

  async start(): Promise<void> {
    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "start",
          },
        },
      })
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: CommandResponse) => {
        if (!result.successful) {
          throw new Error("Could not start mower");
        }
      });
  }

  async stop(): Promise<void> {
    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "stop",
          },
        },
      })
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: CommandResponse) => {
        if (!result.successful) {
          throw new Error("Could not stop mower");
        }
      });
  }

  async clearError(): Promise<void> {
    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "error",
          },
        },
      })
      .catch(handleAuthorizationError)
      .catch(handleNotReachableError)
      .then(resultFromResponse)
      .then((result: CommandResponse) => {
        if (!result.successful) {
          throw new Error("Could not clear mower error");
        }
      });
  }
}
