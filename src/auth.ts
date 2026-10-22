import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, users, type UserRole } from "@/db/schema";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import {
  AuthorizationUnavailableError,
} from "@/lib/auth/errors";
import { logAuthEvent } from "@/lib/auth/diagnostics";
import { refreshAuthMetadata } from "@/lib/auth/metadata-refresh";
import {
  SESSION_MAX_AGE_SECONDS,
  classifyDependencyError,
  parseRememberValue,
} from "@/lib/auth/policy";
import { currentAuthRequest } from "@/lib/auth/request-context";
import { bindSessionLifetime } from "@/lib/auth/session-lifetime";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

class AccountSuspendedSignIn extends CredentialsSignin {
  code = "account_suspended";
}

async function loadAuthUser(userId: string) {
  try {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
        suspendedAt: true,
        name: true,
        email: true,
        image: true,
      },
    });
    return row ?? null;
  } catch (error) {
    throw new AuthorizationUnavailableError(classifyDependencyError(error));
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    ...(isGoogleAuthConfigured()
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
              return {
                id: profile.sub,
                name:
                  profile.name?.trim() ||
                  profile.email?.split("@")[0] ||
                  "User",
                email: profile.email?.toLowerCase() ?? null,
                image: profile.picture,
                emailVerified: profile.email_verified ? new Date() : null,
              };
            },
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        let user;
        try {
          user = await db.query.users.findFirst({
            where: eq(users.email, parsed.data.email.toLowerCase()),
          });
        } catch (error) {
          logAuthEvent({
            stage: "sign-in",
            phase: "initial",
            outcome: "unavailable",
            errorCategory: classifyDependencyError(error),
          });
          throw new AuthorizationUnavailableError(
            classifyDependencyError(error),
          );
        }

        if (!user?.passwordHash) return null;
        if (user.suspendedAt) throw new AccountSuspendedSignIn();

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        const remember = parseRememberValue(
          (credentials as { remember?: unknown } | undefined)?.remember,
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          ...(remember !== undefined ? { remember } : {}),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      try {
        const row = await loadAuthUser(user.id);
        if (row?.suspendedAt) {
          logAuthEvent({
            stage: "sign-in",
            phase: "initial",
            outcome: "suspended",
          });
          return false;
        }
        return true;
      } catch (error) {
        logAuthEvent({
          stage: "sign-in",
          phase: "initial",
          outcome: "unavailable",
          errorCategory:
            error instanceof AuthorizationUnavailableError
              ? error.category
              : classifyDependencyError(error),
        });
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      const establishing = Boolean(user?.id);
      if (user?.id) {
        token.id = user.id;
        token.picture = user.image ?? null;
        const explicit = (user as { remember?: boolean }).remember;
        if (typeof explicit === "boolean") {
          token.remember = explicit;
        } else {
          token.remember = currentAuthRequest()?.remember ?? false;
        }
      }

      if (trigger === "update") {
        if (session?.image !== undefined) token.picture = session.image;
        if (session?.name !== undefined) token.name = session.name;
      }

      if (!token.id) return token;

      const timed = bindSessionLifetime(token, establishing);
      if (!timed) return null;
      token = timed;

      try {
        return await refreshAuthMetadata({
          token,
          establishing,
          trigger,
          loadUser: async (userId) => {
            const row = await loadAuthUser(userId);
            if (!row) return null;
            return {
              id: row.id,
              role: row.role as UserRole,
              suspendedAt: row.suspendedAt,
            };
          },
        });
      } catch (error) {
        if (establishing) throw error;
        logAuthEvent({
          stage: "metadata-refresh",
          phase: "refresh",
          outcome: "preserved",
          errorCategory: classifyDependencyError(error),
        });
        return token;
      }
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image =
          (token.picture as string | null | undefined) ?? null;
        session.user.role = token.role as UserRole | undefined;
        session.user.suspendedAt =
          typeof token.suspendedAt === "string" ? token.suspendedAt : null;
        session.user.authzStale = token.authzStale === true;
      }
      return session;
    },
  },
});
