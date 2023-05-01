import Homey from "homey";
import { Log } from 'homey-log';

class RobonectApp extends Homey.App {
  logger: typeof Log = new Log({ homey: this.homey })

  async onInit() {
    // @ts-ignore
    this.homeyLog = this.logger;

    this.log("RobonectApp has been initialized");
  }
}

module.exports = RobonectApp;
