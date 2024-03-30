import nock from "nock";
import {
  NotReachableError,
  AuthorizationError,
  UnparseableResponseError,
  RobonectClient,
} from "./robonectClient";
import { TimerStatusMode } from "./TimerStatusMode";
import { StatusMode } from "./StatusMode";
import { Mode } from "./Mode";
import { StatusResponse } from "./StatusResponse";

describe("RobonectClient", () => {
  let client: RobonectClient;

  const aStatusResponse: StatusResponse = {
    id: "an_id",
    name: "a_name",
    status: {
      status: StatusMode.mowing,
      distance: 2345,
      stopped: false,
      duration: 5432,
      mode: Mode.auto,
      battery: 95,
      hours: 321,
    },
    timer: {
      status: TimerStatusMode.active,
    },
    blades: {
      quality: 90,
      hours: 345,
      days: 34,
    },
    wlan: {
      signal: -40,
    },
    health: {
      temperature: 15,
      humidity: 50,
    },
    successful: true,
  };

  beforeEach(() => {
    client = new RobonectClient("localhost", "user", "password");
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe("getStatus method", () => {
    it.skip("should throw UnparsableResponseError on empty response", async () => {
      nock("http://localhost").get("/json?cmd=status").reply(200, {});

      const status = await client.getStatus();

      expect(status).toThrow();
    });

    it("should return a StatusResponse for a valid response", async () => {
      nock("http://localhost")
        .get("/json?cmd=status")
        .reply(200, aStatusResponse);

      await expect(client.getStatus()).resolves.toEqual(aStatusResponse);
    });

    it.skip("should throw UnparseableResponseError for responses without required fields", async () => {
      nock("http://localhost")
        .get("/json?cmd=status")
        .reply(200, { unexpectedField: "Unexpected" });

      await expect(client.getStatus()).rejects.toThrow();
    });

    test.each([
      "ECONNREFUSED",
      "ECONNRESET",
      "EHOSTUNREACH",
      "ETIMEDOUT",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
    ])(
      "should throw NotReachableError for %s error code",
      async (errorCode) => {
        nock("http://localhost").get("/json?cmd=status").replyWithError({
          code: errorCode,
        });

        await expect(client.getStatus()).rejects.toThrow(NotReachableError);
      },
    );

    it("should throw NotReachableError for 'Request timeout' in error message", async () => {
      nock("http://localhost").get("/json?cmd=status").replyWithError({
        message: "Request timeout",
      });

      await expect(client.getStatus()).rejects.toThrow(NotReachableError);
    });

    it("should throw AuthorizationError for 401 response status", async () => {
      nock("http://localhost").get("/json?cmd=status").reply(401, {});

      await expect(client.getStatus()).rejects.toThrow(AuthorizationError);
    });

    it("should throw Error for unknown response status codes", async () => {
      nock("http://localhost").get("/json?cmd=status").reply(202, {});

      await expect(client.getStatus()).rejects.toThrow(Error);
    });

    it("should throw UnparseableResponseError when no response is available", async () => {
      nock("http://localhost").get("/json?cmd=status").reply(200, undefined);

      await expect(client.getStatus()).rejects.toThrow(
        UnparseableResponseError,
      );
    });

    it("should rethrow unhandled errors", async () => {
      const unhandledError = new Error("will not be handled by client");

      nock("http://localhost")
        .get("/json?cmd=status")
        .replyWithError(unhandledError);

      await expect(client.getStatus()).rejects.toThrow(unhandledError);
    });
  });

  describe("setMode method", () => {
    it.each([
      [0, "auto"],
      [1, "man"],
      [2, "home"],
      [3, "eod"],
    ])(
      "should successfully set mode %d to %s",
      async (inputMode, queryMode) => {
        // Mock the API response for a successful operation
        nock("http://localhost")
          .get("/json")
          .query({ cmd: "mode", mode: queryMode })
          .reply(200, { successful: true });

        await expect(client.setMode(inputMode)).resolves.toBeUndefined();
      },
    );

    it("should throw error if response is not successful ", async () => {
      // Mock the API response for an unsuccessful operation
      nock("http://localhost")
        .get("/json")
        .query({ cmd: "mode", mode: "auto" })
        .reply(200, { successful: false });

      await expect(client.setMode(0)).rejects.toThrow("Could not set mode");
    });
  });

  describe("startNewJob method", () => {
    it("should successfully start job with valid duration", async () => {
      const testDuration = 30;

      nock("http://localhost")
        .get("/json")
        .query({
          cmd: "mode",
          mode: "job",
          remote_start: 0,
          duration: testDuration,
        })
        .reply(200, { successful: true });

      await expect(client.startNewJob(testDuration)).resolves.toBeUndefined();
    });

    it("should throw error if response is not successful", async () => {
      const testDuration = 30;

      nock("http://localhost")
        .get("/json")
        .query({
          cmd: "mode",
          mode: "job",
          remote_start: 0,
          duration: testDuration,
        })
        .reply(200, { successful: false });

      await expect(client.startNewJob(testDuration)).rejects.toThrow(
        "Could not start job",
      );
    });
  });
});
