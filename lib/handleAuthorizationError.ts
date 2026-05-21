import { AuthorizationError } from "./AuthorizationError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleAuthorizationError(err: any): never {
  if (err && err.statusCode === 401) {
    throw new AuthorizationError("Unauthorized, wrong username or password");
  }
  throw err;
}
