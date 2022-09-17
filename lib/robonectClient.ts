import { IRequestOptions, RestClient, IRestResponse } from "typed-rest-client";
import { BasicCredentialHandler } from "typed-rest-client/Handlers";

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
    duration: number; // minutes in this mode?
    mode: number;
    battery: number; // percent
    hours: number; // total run time
  };
  timer: TimerResponse;
  blades: {
    quality: string; // unclear
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
      .then((response: IRestResponse<StatusResponse>) => {
        if (!response.result) {
          throw new Error("Could not fetch data");
        }
        return response.result!!;
      });
  }

  async setMode(mode: number): Promise<void> {
    return this.client
      .get<CommandResponse>("", <IRequestOptions>{
        queryParameters: {
          params: {
            cmd: "mode",
            mode,
          },
        },
      })
      .then((response: IRestResponse<CommandResponse>) => {
        if (!response.result?.successful) {
          throw new Error("Could not set mode");
        }
      });
  }
}
