import Homey from "homey";
import { Log } from 'homey-log';

class RobonectApp extends Homey.App {
  logger: typeof Log = new Log({ homey: this.homey, options: {release: '1.0.6'} })

  setupLogging() {
    // @ts-ignore
    this.homeyLog = this.logger
    // @ts-ignore
    this.homeyLog.setUser(this.homey.cloud.getHomeyId())
  }

  async onInit() {
    this.setupLogging()
    this.log("RobonectApp has been initialized");
  }
}

module.exports = RobonectApp;
