import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, users, type UserRole } from "@/db/schema";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const ROLE_REFRESH_MS = 60_000;

async function loadAuthUser(userId: string) {
  return db.query.users.findFirst({
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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: {
    strategy: "jwt",
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
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email.toLowerCase()),
        });

        if (!user?.passwordHash || user.suspendedAt) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const row = await loadAuthUser(user.id);
      if (row?.suspendedAt) return false;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        token.picture = user.image ?? null;
      }

      const now = Date.now();
      const checkedAt = Number(token.adminCheckedAt ?? 0);
      const shouldRefresh =
        Boolean(user?.id) ||
        trigger === "update" ||
        !token.role ||
        now - checkedAt > ROLE_REFRESH_MS;

      if (token.id && shouldRefresh) {
        const row = await loadAuthUser(token.id as string);
        if (row) {
          token.role = row.role;
          token.suspendedAt = row.suspendedAt?.toISOString() ?? null;
          token.adminCheckedAt = now;
        }
      }

      if (trigger === "update") {
        if (session?.image !== undefined) token.picture = session.image;
        if (session?.name !== undefined) token.name = session.name;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image =
          (token.picture as string | null | undefined) ?? null;
        session.user.role = token.role as UserRole | undefined;
        session.user.suspendedAt =
          typeof token.suspendedAt === "string" ? token.suspendedAt : null;
      }
      return session;
    },
  },
});
