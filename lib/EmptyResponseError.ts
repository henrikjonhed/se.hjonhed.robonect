export class EmptyResponseError extends Error {
  response: unknown;
  constructor(message: string, response: unknown) {
    super(message);
    this.name = "EmptyResponseError";
    this.response = response;
  }
}
