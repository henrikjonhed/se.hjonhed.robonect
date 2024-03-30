import { TimerResponse } from "./TimerResponse";
import { StatusMode } from "./StatusMode";
import { Mode } from "./Mode";

export interface StatusResponse {
  name: string;
  id: string;
  status: {
    status: StatusMode;
    distance: number; // meter?
    stopped: boolean;
    duration: number; // seconds in this mode
    mode: Mode;
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
