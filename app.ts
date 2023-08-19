import Homey from "homey";
// @ts-ignore
import { Log } from "homey-log";

class RobonectApp extends Homey.App {
  logger?: typeof Log;

  async setupLogging() {
    this.logger = new Log({
      homey: this.homey,
      options: { release: this.homey.manifest.version },
    });
    // @ts-ignore
    this.homeyLog = this.logger;

    const homeyId = await this.homey.cloud.getHomeyId();
    // @ts-ignore
    this.homeyLog.setUser({ id: homeyId });
  }

  async onInit() {
    await this.setupLogging();
    this.log("RobonectApp has been initialized");
  }
}

module.exports = RobonectApp;
