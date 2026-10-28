import { NextResponse } from "next/server";
import argon2 from "argon2";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOpaqueToken, hashToken } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email: z.string().trim().email().max(254) }),
  z.object({ action: z.literal("confirm"), token: z.string().min(20).max(128), password: z.string().min(12).max(128) }),
]);

export async function POST(request: Request) {
  const expected = process.env.APP_URL;
  const origin = request.headers.get("origin");
  if (!expected || !origin || new URL(origin).origin !== new URL(expected).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (parsed.data.action === "request") {
    const generic = { message: "If the account exists, a password reset email will be sent." };
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || user.status !== "ACTIVE" || !user.passwordHash) return NextResponse.json(generic, { status: 202 });
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }
    const raw = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 20 * 60 * 1000) },
    });
    const link = new URL("/reset-password", expected);
    link.searchParams.set("token", raw);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sent = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Reset your password",
      text: `Use this one-time link within 20 minutes: ${link.toString()}`,
    });
    if (sent.error) return NextResponse.json({ error: "Unable to send reset email." }, { status: 503 });
    await prisma.securityAuditEvent.create({ data: { actorId: user.id, eventType: "PASSWORD_RESET_REQUESTED" } });
    return NextResponse.json(generic, { status: 202 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }
  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.securityAuditEvent.create({ data: { actorId: record.userId, eventType: "PASSWORD_RESET_COMPLETED" } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  return NextResponse.json({ message: "Password updated. Please sign in again." });
}
