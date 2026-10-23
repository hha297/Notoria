import { AsyncLocalStorage } from "node:async_hooks";
import {
  correlationIdFrom,
  readRememberCookie,
} from "@/lib/auth/policy";

type AuthRequestContext = {
  requestId: string;
  remember?: boolean;
};

const storage = new AsyncLocalStorage<AuthRequestContext>();

export function runWithAuthRequest<T>(
  request: Request,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(
    {
      requestId: correlationIdFrom(request),
      remember: readRememberCookie(request.headers.get("cookie")),
    },
    fn,
  );
}

export function currentAuthRequest(): AuthRequestContext | undefined {
  return storage.getStore();
}
