import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  mfaCode: z.string().trim().max(16).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8, updateAge: 60 * 15 },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "Authenticator code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE" || !user.emailVerified || !user.passwordHash) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const validPassword = await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false);
        if (!validPassword) {
          const failedLoginCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount,
              lockedUntil: failedLoginCount >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          await prisma.securityAuditEvent.create({
            data: { actorId: user.id, eventType: "LOGIN_FAILURE" },
          }).catch(() => undefined);
          return null;
        }

        if (user.mfaEnabled) {
          if (!parsed.data.mfaCode || !user.mfaSecretEncrypted) return null;
          const secret = decryptSecret(user.mfaSecretEncrypted);
          const validTotp = authenticator.check(parsed.data.mfaCode, secret);
          if (!validTotp) {
            const backupCodes = await prisma.mfaBackupCode.findMany({
              where: { userId: user.id, usedAt: null },
              select: { id: true, codeHash: true },
            });
            let matchedId: string | undefined;
            for (const backup of backupCodes) {
              if (await argon2.verify(backup.codeHash, parsed.data.mfaCode).catch(() => false)) {
                matchedId = backup.id;
                break;
              }
            }
            if (!matchedId) return null;
            const consumed = await prisma.mfaBackupCode.updateMany({
              where: { id: matchedId, userId: user.id, usedAt: null },
              data: { usedAt: new Date() },
            });
            if (consumed.count !== 1) return null;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await prisma.securityAuditEvent.create({
          data: { actorId: user.id, eventType: "LOGIN_SUCCESS" },
        }).catch(() => undefined);
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (verified !== true || !user.email) return false;
        const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (existing && existing.status !== "ACTIVE") return false;
        if (existing?.passwordHash) return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        const record = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, status: true, sessionVersion: true } });
        if (!record || record.status !== "ACTIVE") return {};
        token.role = record.role;
        token.authVersion = record.sessionVersion;
      } else if (token.sub) {
        const record = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, status: true, sessionVersion: true } });
        if (!record || record.status !== "ACTIVE" || record.sessionVersion !== token.authVersion) return {};
        token.role = record.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = String(token.role ?? "USER");
      }
      return session;
    },
  },
});
