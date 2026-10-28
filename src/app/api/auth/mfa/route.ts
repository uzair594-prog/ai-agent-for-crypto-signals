import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("confirm"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("disable"), code: z.string().regex(/^\d{6}$/), password: z.string().min(1).max(128) }),
]);

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "Account unavailable" }, { status: 403 });

  if (parsed.data.action === "setup") {
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: userId }, data: { mfaSecretEncrypted: encryptSecret(secret), mfaEnabled: false, mfaConfirmedAt: null } });
    const uri = authenticator.keyuri(user.email, "MEXC Market Research", secret);
    return NextResponse.json({ secret, qrDataUrl: await QRCode.toDataURL(uri), note: "Save this once, then confirm with a current 6-digit code." });
  }

  if (!user.mfaSecretEncrypted) return NextResponse.json({ error: "MFA setup has not started" }, { status: 400 });
  const secret = decryptSecret(user.mfaSecretEncrypted);
  if (!authenticator.check(parsed.data.code, secret)) return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });

  if (parsed.data.action === "confirm") {
    const backupCodes = Array.from({ length: 8 }, () => authenticator.generateSecret().slice(0, 10).toUpperCase());
    await prisma.$transaction([
      prisma.mfaBackupCode.deleteMany({ where: { userId } }),
      prisma.mfaBackupCode.createMany({ data: await Promise.all(backupCodes.map(async (code) => ({
        userId,
        codeHash: await argon2.hash(code),
      }))) }),
      prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaConfirmedAt: new Date() } }),
      prisma.securityAuditEvent.create({ data: { actorId: userId, eventType: "MFA_ENABLED" } }),
    ]);
    return NextResponse.json({ enabled: true, backupCodes, warning: "Copy these recovery codes now. They will not be shown again." });
  }

  if (!user.passwordHash || !(await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false))) {
    return NextResponse.json({ error: "Re-authentication failed" }, { status: 403 });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaConfirmedAt: null, mfaSecretEncrypted: null } }),
    prisma.mfaBackupCode.deleteMany({ where: { userId } }),
    prisma.securityAuditEvent.create({ data: { actorId: userId, eventType: "MFA_DISABLED" } }),
  ]);
  return NextResponse.json({ enabled: false });
}
