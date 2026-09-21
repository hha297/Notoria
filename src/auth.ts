import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
            /**
             * Link Google to an existing credentials account with the same
             * email so we never create a duplicate user identity.
             */
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

        if (!parsed.success) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email.toLowerCase()),
        });

        // OAuth-only accounts have no passwordHash — do not invent one.
        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.picture = user.image ?? null;
      }

      if (trigger === "update") {
        if (session?.image !== undefined) {
          token.picture = session.image;
        }
        if (session?.name !== undefined) {
          token.name = session.name;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.image =
          (token.picture as string | null | undefined) ?? null;
      }

      return session;
    },
  },
});
