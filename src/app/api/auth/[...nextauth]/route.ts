import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { runWithAuthRequest } from "@/lib/auth/request-context";
import {
  appendRememberPreferenceClear,
  applySessionPersistence,
  shouldClearRememberPreference,
} from "@/lib/auth/session-cookie";

async function handle(request: NextRequest) {
  // Server surface: JWT callback may refresh role/suspension from the DB.
  return runWithAuthRequest(
    request,
    async () => {
      const response =
        request.method === "POST"
          ? await handlers.POST(request)
          : await handlers.GET(request);
      const persisted = await applySessionPersistence(response);
      const pathname = new URL(request.url).pathname;
      if (!shouldClearRememberPreference(pathname)) return persisted;
      return appendRememberPreferenceClear(persisted, request);
    },
    { surface: "server" },
  );
}

export const GET = handle;
export const POST = handle;
