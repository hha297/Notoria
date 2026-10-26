import { AsyncLocalStorage } from "node:async_hooks";
import {
  correlationIdFrom,
  readRememberCookie,
} from "@/lib/auth/policy";

export type AuthRequestSurface = "middleware" | "server";

type AuthRequestContext = {
  requestId: string;
  remember?: boolean;
  /**
   * middleware: validate JWT signature and hard session expiry only.
   * server: may refresh role/suspension from the database.
   */
  surface: AuthRequestSurface;
};

const storage = new AsyncLocalStorage<AuthRequestContext>();

export function runWithAuthRequest<T>(
  request: Request,
  fn: () => Promise<T>,
  options?: { surface?: AuthRequestSurface },
): Promise<T> {
  return storage.run(
    {
      requestId: correlationIdFrom(request),
      remember: readRememberCookie(request.headers.get("cookie")),
      surface: options?.surface ?? "server",
    },
    fn,
  );
}

export function currentAuthRequest(): AuthRequestContext | undefined {
  return storage.getStore();
}

/** True when Auth.js is decoding a session for the edge/Node middleware gate. */
export function isMiddlewareAuthSurface(): boolean {
  return currentAuthRequest()?.surface === "middleware";
}
