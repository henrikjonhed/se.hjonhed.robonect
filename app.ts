import Homey from "homey";
import { Log } from 'homey-log';

class RobonectApp extends Homey.App {
  logger: typeof Log = new Log({ homey: this.homey, options: {release: '1.0.7'} })

  async setupLogging() {
    // @ts-ignore
    this.homeyLog = this.logger
    const homeyId = await this.homey.cloud.getHomeyId()
    // @ts-ignore
    this.homeyLog.setUser(homeyId)
  }

  async onInit() {
    await this.setupLogging()
    this.log("RobonectApp has been initialized");
  }
}

module.exports = RobonectApp;
