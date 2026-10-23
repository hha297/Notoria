"use client";

import { SessionProvider } from "next-auth/react";
import {
  AUTH_SESSION_REFETCH_INTERVAL,
  AUTH_SESSION_REFETCH_ON_WINDOW_FOCUS,
} from "@/lib/auth/client-session";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={AUTH_SESSION_REFETCH_INTERVAL}
      refetchOnWindowFocus={AUTH_SESSION_REFETCH_ON_WINDOW_FOCUS}
    >
      {children}
    </SessionProvider>
  );
}
