import Homey from "homey";
import { DiscoveryResultMDNSSD } from "homey/lib/DiscoveryStrategy";
import moment from "moment";
import {
  TimerResponse,
  StatusResponse,
  RobonectClient,
  AuthorizationError,
  NotReachableError,
} from "../../lib/robonectClient";

class RobonectDevice extends Homey.Device {
  pollingInterval?: NodeJS.Timeout;
  communicationTimer?: NodeJS.Timeout;
  lastCapturedExceptionMessage?: string;

  onDiscoveryResult(discoveryResult: Homey.DiscoveryResult): boolean {
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(
    discoveryResult: Homey.DiscoveryResult,
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
    this.communicationTimer = this.homey.setTimeout(
      async () => {
        await this.setUnavailable("Have not heard from device in 24 hours");
      },
      1 * 1000 * 60 * 60 * 24,
    ); // 1 day
  }

  getTimerStatusString(timerStatus?: TimerResponse) {
    switch (timerStatus?.status) {
      default:
      case 0:
        return "N/A";
      case 1:
        return "Active";
      case 2: {
        return timerStatus.next
          ? moment(
              `${timerStatus.next.date} ${timerStatus.next.time}`,
            ).calendar()
          : "N/A";
      }
    }
  }

  private async updateCurrentErrorMessage(errorMessage?: string) {
    const currentErrorMessage = await this.getSetting("error_message");
    if (
      errorMessage &&
      currentErrorMessage !== errorMessage &&
      errorMessage !== "No error is currently set"
    ) {
      await this.homey.notifications.createNotification({
        excerpt: `Mower is in trouble: ${errorMessage}`,
      });
    }
    await this.setSettings({ error_message: errorMessage });
  }

  private async captureException(error: unknown) {
    if (error instanceof Error) {
      if (error.message === this.lastCapturedExceptionMessage) {
        return;
      } else {
        this.lastCapturedExceptionMessage = error.message;
      }
    }

    // @ts-ignore
    await this.homey.app.logger.captureException(error);
  }

  private async pollData() {
    try {
      const settings = this.getSettings();
      const client = new RobonectClient(
        settings.address,
        settings.username,
        settings.password,
      );

      const statusResponse: StatusResponse = await client.getStatus();
      this.log(statusResponse);

      this.feedCommunicationWatchdog();
      await this.setAvailable();

      const { error } = statusResponse;
      if (error) {
        this.log("setting warning: " + error.error_message);
        await this.setWarning(error.error_message);
        await this.updateCurrentErrorMessage(error.error_message);
        this.setCapabilityValue("alarm_generic.error_active", true);
      } else {
        this.updateCurrentErrorMessage("No error is currently set");
        await this.unsetWarning();
        this.setCapabilityValue("alarm_generic.error_active", false);
      }

      const { status, wlan, timer, health, blades } = statusResponse;
      if (status) {
        this.setCapabilityValue("measure_battery", status.battery);
        this.setCapabilityValue("status_mode", status.status.toString());
        this.setCapabilityValue("mode", status.mode.toString());
        this.setCapabilityValue("alarm_generic.stopped", status.stopped);
        this.setCapabilityValue("total_run_time", status.hours);
      }
      if (wlan) {
        this.setCapabilityValue("signal", wlan.signal);
      }
      this.setCapabilityValue("timer_status", this.getTimerStatusString(timer));
      if (health) {
        this.setCapabilityValue("measure_temperature", health.temperature);
        this.setCapabilityValue("measure_humidity", health.humidity);
      }
      if (blades) {
        this.setCapabilityValue("blade_quality", blades.quality);
      }
    } catch (err: unknown) {
      this.error(err);
      if (err instanceof AuthorizationError) {
        await this.setUnavailable(
          "Authorization error, please check your credentials",
        );
        return;
      } else if (err instanceof NotReachableError) {
        return;
      }
      await this.captureException(err);
    }
  }

  private async syncCapabilities() {
    if (!this.hasCapability("button.poll_now")) {
      await this.addCapability("button.poll_now");
    }
    if (!this.hasCapability("blade_quality")) {
      await this.addCapability("blade_quality");
    }
    if (!this.hasCapability("alarm_generic.stopped")) {
      await this.addCapability("alarm_generic.stopped");
    }
    if (!this.hasCapability("alarm_generic.error_active")) {
      await this.addCapability("alarm_generic.error_active");
    }
    if (!this.hasCapability("total_run_time")) {
      await this.addCapability("total_run_time");
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

    await this.syncCapabilities();

    this.registerCapabilityListener("mode", (mode: number) => {
      this.setMode(mode);
    });
    this.registerCapabilityListener("button.poll_now", async () => {
      await this.pollData();
    });

    await this.pollData();
    const settings = this.getSettings();
    this.pollingInterval = this.homey.setInterval(
      async () => {
        await this.pollData();
      },
      settings.poll_interval * 60 * 1000,
    );
  }

  async onUninit() {
    this.log("RobonectDevice has been uninitialized");
    this.homey.clearInterval(this.pollingInterval);
  }

  async setMode(mode: number) {
    this.log(`Setting mode to ${mode}`);
    const settings = this.getSettings();
    const client = new RobonectClient(
      settings.address,
      settings.username,
      settings.password,
    );
    await client.setMode(mode);
    await this.pollData();
  }

  async startNewJob(duration_in_minutes: number) {
    this.log(`Starting new job for ${duration_in_minutes} minutes`);
    const settings = this.getSettings();
    const client = new RobonectClient(
      settings.address,
      settings.username,
      settings.password,
    );
    await client.startNewJob(duration_in_minutes);
    await this.pollData();
  }

  async onSettings({
    newSettings,
    changedKeys,
  }: {
    newSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes("poll_interval")) {
      this.homey.clearInterval(this.pollingInterval);
      this.homey.setInterval(
        async () => {
          await this.pollData();
        },
        (newSettings as { poll_interval: number }).poll_interval * 60 * 1000,
      );
    }
  }
}

module.exports = RobonectDevice;
