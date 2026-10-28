import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length > 128) return NextResponse.redirect(new URL("/login?verification=invalid", url.origin));

  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.redirect(new URL("/login?verification=invalid", url.origin));
  }

  const now = new Date();
  const consumed = await prisma.emailVerificationToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (consumed.count !== 1) return NextResponse.redirect(new URL("/login?verification=invalid", url.origin));

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: now, status: "ACTIVE" },
  });
  await prisma.securityAuditEvent.create({
    data: { actorId: record.userId, eventType: "EMAIL_VERIFIED" },
  });
  return NextResponse.redirect(new URL("/login?verification=success", url.origin));
}
