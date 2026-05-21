export class NotReachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotReachableError";
  }
}
