import Homey from "homey";
import * as Sentry from "@sentry/node";

class RobonectApp extends Homey.App {
  async onInit() {
    Sentry.init({
      dsn: Homey.env.SENTRY_DSN
    });

    this.log("RobonectApp has been initialized");
  }
}

module.exports = RobonectApp;
