import { NextResponse } from "next/server";
import argon2 from "argon2";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOpaqueToken, hashToken } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

function allowedOrigin(request: Request): boolean {
  const expected = process.env.APP_URL;
  const origin = request.headers.get("origin");
  if (!expected || !origin) return false;
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the submitted details." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ message: "If the address can be registered, a verification email will be sent." }, { status: 202 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.APP_URL) {
    return NextResponse.json({ error: "Registration email service is not configured." }, { status: 503 });
  }

  const passwordHash = await argon2.hash(parsed.data.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const rawToken = createOpaqueToken();
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      status: "PENDING_VERIFICATION",
      verificationTokens: {
        create: { tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      },
    },
    select: { id: true, email: true },
  });

  const verifyUrl = new URL("/api/auth/verify-email", process.env.APP_URL);
  verifyUrl.searchParams.set("token", rawToken);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Verify your account",
    text: `Verify your email within 30 minutes: ${verifyUrl.toString()}`,
  });
  if (result.error) {
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    return NextResponse.json({ error: "Unable to send verification email. Please try later." }, { status: 503 });
  }
  await prisma.securityAuditEvent.create({ data: { actorId: user.id, eventType: "REGISTRATION_CREATED" } });
  return NextResponse.json({ message: "If the address can be registered, a verification email will be sent." }, { status: 202 });
}
