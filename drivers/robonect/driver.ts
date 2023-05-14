import Homey from "homey";
import { RobonectClient } from "../../lib/robonectClient";

class RobonectDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log("RobonectDriver has been initialized");
    this.homey.flow.getActionCard("set-mode-to").registerRunListener((args) => {
      args.device.setMode(Number(args.mode));
    });
    this.homey.flow.getActionCard("start-new-job").registerRunListener((args) => {
      args.device.startNewJob(args.duration);
    });
  }

  onPair(session: Homey.Driver.PairSession) {
    let device: any;

    session.setHandler("list_devices", async () => {
      const discoveryStrategy = this.getDiscoveryStrategy();
      this.log(discoveryStrategy);
      const discoveryResults = discoveryStrategy.getDiscoveryResults();
      this.log(discoveryResults);
      const devices = Object.values(discoveryResults).map((discoveryResult) => {
        const mdnsDiscoveryResult =
          discoveryResult as unknown as Homey.DiscoveryResultMDNSSD;

        return {
          name: mdnsDiscoveryResult.name,
          data: {
            id: mdnsDiscoveryResult.id,
          },
          settings: {
            address: mdnsDiscoveryResult.address,
          },
        };
      });
      return devices;
    });

    session.setHandler("list_devices_selection", async (selectedDevices) => {
      this.log(selectedDevices);
      device = selectedDevices[0];
    });

    session.setHandler("login", async (data) => {
      const { address } = device.settings;
      this.log(`Logging in to ${address} with user ${data.username}`);
      const client = new RobonectClient(address, data.username, data.password);
      try {
        await client.getStatus();
        this.log("login successful");
        device.settings.username = data.username;
        device.settings.password = data.password;
        return true;
      } catch (err) {
        this.error(err);
      }
      return false;
    });

    session.setHandler("add_device", async () => {
      return device;
    });
  }
}

module.exports = RobonectDriver;
