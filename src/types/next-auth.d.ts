import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      suspendedAt?: string | null;
      /** Metadata refresh failed; do not treat role as freshly verified. */
      authzStale?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: UserRole;
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
    suspendedAt?: string | null;
    adminCheckedAt?: number;
    /**
     * True: 30-day session. False: 24-hour session.
     * Missing means a pre-existing long session.
     */
    remember?: boolean;
    /** Absolute end of this session in epoch ms, set at sign-in. */
    sessionExpiresAt?: number;
    authzStale?: boolean;
    authzRetryAt?: number;
    authzBackoffMs?: number;
  }
}
