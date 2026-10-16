export class AccountSuspendedError extends Error {
  constructor(message = "ACCOUNT_SUSPENDED") {
    super(message);
    this.name = "AccountSuspendedError";
  }
}
