import { TimerStatusMode } from "./TimerStatusMode";

export interface TimerResponse {
  status: TimerStatusMode;
  next?: {
    date: string;
    time: string;
    unix: number;
  };
}
