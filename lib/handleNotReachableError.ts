import { NotReachableError } from "./NotReachableError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleNotReachableError(err: any): never {
  if (
    err &&
    (err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET" ||
      err.code === "EHOSTUNREACH" ||
      err.code === "ETIMEDOUT")
  ) {
    throw new NotReachableError("Could not reach Robonect");
  }
  if (
    err &&
    (err.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
      err.code === "CERT_HAS_EXPIRED")
  ) {
    throw new NotReachableError("Could not reach Robonect, certificate error");
  }
  if (err && err.message && err.message.includes("Request timeout")) {
    throw new NotReachableError("Could not reach Robonect, timeout");
  }

  throw err;
}
