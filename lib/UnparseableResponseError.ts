export class UnparseableResponseError extends Error {
  response: unknown;
  constructor(message: string, response: unknown) {
    super(message);
    this.name = "UnparseableResponseError";
    this.response = response;
  }
}
