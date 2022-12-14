import Homey from "homey";
import { DiscoveryResultMDNSSD } from "homey/lib/DiscoveryStrategy";
import moment from "moment";
import * as Sentry from "@sentry/node";
import {
  TimerResponse,
  StatusResponse,
  RobonectClient,
} from "../../lib/robonectClient";

class RobonectDevice extends Homey.Device {
  pollingInterval?: NodeJS.Timeout;
  communicationTimer?: NodeJS.Timeout;

  onDiscoveryResult(discoveryResult: Homey.DiscoveryResult): boolean {
    this.log(`onDiscovery: ${discoveryResult}, data:${this.getData().id}`);
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(
    discoveryResult: Homey.DiscoveryResult
  ): Promise<void> {
    this.log(`onDiscoveryAvailable: ${discoveryResult}`);
    this.setAvailable();
    this.setSettings({
      address: (discoveryResult as DiscoveryResultMDNSSD).address,
    });
  }

  onDiscoveryAddressChanged(discoveryResult: Homey.DiscoveryResult): void {
    this.setSettings({
      address: (discoveryResult as DiscoveryResultMDNSSD).address,
    });
  }

  feedCommunicationWatchdog() {
    this.homey.clearTimeout(this.communicationTimer);
    this.communicationTimer = this.homey.setTimeout(() => {
      this.setUnavailable("Have not heard from device in 24 hours");
    }, 1 * 1000 * 60 * 60 * 24); // 1 day
  }

  getTimerStatusString(timerStatus?: TimerResponse) {
    switch (timerStatus?.status) {
      default:
      case 0:
        return "N/A";
      case 1:
        return "Active";
      case 2: {
        return moment(
          `${timerStatus.next.date} ${timerStatus.next.time}`
        ).calendar();
      }
    }
  }

  private async pollData() {
    try {
      const settings = this.getSettings();
      const client = new RobonectClient(
        settings.address,
        settings.username,
        settings.password
      );

      const statusResponse: StatusResponse = await client.getStatus();

      this.feedCommunicationWatchdog();

      const { error } = statusResponse;
      if (error) {
        this.setWarning(error.error_message);
      } else {
        this.unsetWarning();
      }

      const { status } = statusResponse;
      this.setCapabilityValue("measure_battery", status?.battery);
      this.setCapabilityValue("status_mode", status?.status.toString());
      this.setCapabilityValue("mode", status?.mode.toString());

      this.setCapabilityValue("signal", statusResponse.wlan.signal);

      const { timer } = statusResponse;
      this.setCapabilityValue("timer_status", this.getTimerStatusString(timer));

      const { health } = statusResponse;
      this.setCapabilityValue("measure_temperature", health?.temperature);
      this.setCapabilityValue("measure_humidity", health?.humidity);

      this.setAvailable();
    } catch (err) {
      this.error(err);
      Sentry.captureException(err);
    }
  }

  async onInit() {
    this.log("RobonectDevice has been initialized");

    moment.updateLocale("en", {
      calendar: {
        lastDay: "[Yesterday at] HH:mm",
        sameDay: "HH:mm",
        nextDay: "ddd HH:mm",
        lastWeek: "[last] ddd [at] HH:mm",
        nextWeek: "ddd HH:mm",
        sameElse: "L",
      },
    });

    this.registerCapabilityListener("mode", (mode: number) => {
      this.setMode(mode);
    });

    await this.pollData();
    const settings = this.getSettings();
    this.pollingInterval = this.homey.setInterval(() => {
      this.pollData();
    }, settings.poll_interval * 60 * 1000);
  }

  async setMode(mode: number) {
    this.log(`Setting mode to ${mode}`);
    const settings = this.getSettings();
    const client = new RobonectClient(
      settings.address,
      settings.username,
      settings.password
    );
    await client.setMode(mode);
  }

  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: any;
    newSettings: any;
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes("poll_interval")) {
      this.homey.clearInterval(this.pollingInterval);
      this.homey.setInterval(() => {
        this.pollData();
      }, newSettings.poll_interval * 60 * 1000);
    }
  }
}

module.exports = RobonectDevice;
