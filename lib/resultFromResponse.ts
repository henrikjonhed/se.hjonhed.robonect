import { IRestResponse } from "typed-rest-client";
import { EmptyResponseError } from "./EmptyResponseError";

export function resultFromResponse<T>(response: IRestResponse<T>): T {
  if (response.statusCode !== 200) {
    throw new Error(
      "Could not read data from Robonect, status code: " + response.statusCode,
    );
  }
  if (!response.result) {
    throw new EmptyResponseError(
      "Unable to read data from Robonect",
      response,
    );
  }
  return response.result!;
}
