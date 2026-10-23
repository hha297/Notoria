export class AccountSuspendedError extends Error {
  readonly statusCode = 403;

  constructor(message = "ACCOUNT_SUSPENDED") {
    super(message);
    this.name = "AccountSuspendedError";
  }
}

/**
 * The session is still valid, but a database or network read required for
 * authorization did not complete. Callers must not treat this as a missing user.
 */
export class AuthorizationUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = "AUTH_UNAVAILABLE";
  readonly category: string;

  constructor(category: string) {
    super("AUTH_UNAVAILABLE");
    this.name = "AuthorizationUnavailableError";
    this.category = category;
  }
}
