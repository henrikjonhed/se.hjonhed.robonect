import Homey from "homey";
import { RobonectClient } from "../../lib/robonectClient";

class RobonectDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log("RobonectDriver has been initialized");
    this.homey.flow
      .getConditionCard("status_mode_condition")
      .registerRunListener((args) => {
        this.log(
          `Checking if ${
            args.status_mode
          } is equal to ${args.device.getCapabilityValue("status_mode")}`
        );
        return (
          args.status_mode === args.device.getCapabilityValue("status_mode")
        );
      });
    this.homey.flow.getActionCard("set-mode-to").registerRunListener((args) => {
      args.device.setMode(Number(args.mode));
    });
    this.homey.flow
      .getActionCard("start-new-job")
      .registerRunListener((args) => {
        args.device.startNewJob(args.duration);
      });
  }

  onPair(session: Homey.Driver.PairSession) {
    let device = {
      name: "",
      data: {
        id: "",
      },
      settings: {
        address: "",
        username: "",
        password: "",
      },
    };

    session.setHandler("list_devices", async () => {
      const discoveryStrategy = this.getDiscoveryStrategy();
      this.log(discoveryStrategy);
      const discoveryResults = discoveryStrategy.getDiscoveryResults();
      this.log(discoveryResults);
      const devices = Object.values(discoveryResults)
        .map((discoveryResult) => {
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
        })
        .filter((device) => {
          // This is done by Homey SDK before presenting ths list to the
          // user, but needed here to make zero length check of devices valid.
          return !this.getDevices().some((existingDevice) => {
            return existingDevice.getData().id === device.data.id;
          });
        });

      if (devices.length === 0) {
        await session.showView("address_and_credentials");
      }

      return devices;
    });

    session.setHandler("list_devices_selection", async (selectedDevices) => {
      this.log(selectedDevices);
      device = selectedDevices[0];
    });

    session.setHandler("get_device", async () => {
      this.log(`get_device: ${device.settings.address}`);
      return device;
    });

    session.setHandler("address_and_credentials", async (data) => {
      this.log(`Logging in to ${data.address} with user ${data.username}`);

      const client = new RobonectClient(
        data.address,
        data.username,
        data.password
      );

      // Will throw if not successful
      const statusResponse = await client.getStatus();

      this.log("login successful");
      device.name = statusResponse.name;
      device.data.id = `robonect-${statusResponse.id}`;
      device.settings.address = data.address;
      device.settings.username = data.username;
      device.settings.password = data.password;
    });

    session.setHandler("add_device", async () => {
      return device;
    });
  }
}

module.exports = RobonectDriver;
