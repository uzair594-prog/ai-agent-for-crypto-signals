# Production Architecture Specification

Version: 1.0.0
Project: MEXC Read-only Market Intelligence
Stack: Next.js App Router, TypeScript, PostgreSQL on Neon, Prisma, Auth.js, Zod, optional Redis-compatible rate limiting, Vercel.

## 1. Product contract and safety invariants
- Provide read-only public exchange data, market summaries, indicators, historical analysis, source-linked news/context, data-quality warnings and educational backtests.
- Never create actionable leveraged futures LONG/SHORT calls, exact entries, stop-loss/take-profit, leverage/position sizing recommendations, or order-execution code.
- Never request, store, or use MEXC trading API keys. Public market endpoints only.
- No exchange order routes, signed order requests, withdrawals, or broker adapters.
- AI output is research commentary, not financial advice. Show source, observation time, stale-data status, uncertainty, conflicts and missing evidence.

## 2. Identity and authentication
Use Auth.js (NextAuth v5) with PrismaAdapter for Google OAuth and database-backed sessions. Add a separate email/password registration and verification flow; Credentials provider alone is not a complete identity system.
- Google OAuth: exact redirect URI allowlist, provider-managed state/PKCE/nonce, verified provider email required. Do not automatically link Google to a pre-existing password account solely because email strings match. Require an authenticated account-linking flow or fresh proof of control.
- Email/password: Zod validation; normalize email; Argon2id preferred; minimum 12-character password, generous maximum, breached-password screening where available, no arbitrary composition rules.
- Verification/reset: cryptographically random single-use tokens; store only SHA-256 token hashes; short expiry; consume atomically; constant-time comparison; generic responses prevent account enumeration.
- Sessions: secure, HttpOnly, SameSite=Lax cookies; HTTPS in production; rotate on privilege change; explicit revocation support. Never expose provider access tokens to the client.
- MFA: TOTP enrollment after password/recent re-authentication; show secret/QR once; enable only after valid first code; encrypt TOTP secret with dedicated server-side key; require MFA during sign-in; rate-limit verification; single-use hashed backup codes; notify on enrollment/removal.
- RBAC: server-side policy checks on every protected route/action. Roles USER, ANALYST, ADMIN, SECURITY_ADMIN. Default deny; users cannot set their own role; admin elevation requires audited operation. UI hiding is not authorization.
- Brute force protection: per-IP and per-account throttles, exponential cooldown, generic login errors, optional Redis/Upstash in production. Avoid permanent lockout that enables denial-of-service.
- Audit events: record auth success/failure, verification, reset, MFA changes, role changes, session revocation and admin actions. Never log passwords, tokens, TOTP secrets, OAuth tokens, or raw sensitive request bodies.
- Privacy: collect minimum data; define retention; support account export/deletion policy; hash IP addresses with rotating salt if retained.

## 3. Prisma data model
The schema includes Auth.js adapter models plus User role/status, email verification tokens, password reset tokens, MFA backup codes, authenticators, revoked sessions, security audit events, market snapshots/candles and research reports. Review schema against exact installed Prisma and Auth.js adapter versions before migration.

## 4. Market ingestion and analysis
- Ingest public MEXC data via documented public REST/WebSocket endpoints. Respect rate limits, reconnect with bounded exponential backoff and jitter, deduplicate candles by symbol/timeframe/openTime, and record source/observedAt/receivedAt.
- Keep ingestion in a persistent worker or managed scheduled job; do not assume a Vercel request handler runs continuously.
- Validate upstream payloads with Zod. Quarantine malformed data. Maintain heartbeat, lag, error rate, last successful update and freshness metrics.
- Indicator calculations must be deterministic and unit-tested. No future data leakage in backtests. Include fees, spread/slippage assumptions, missing bars, selection caveats and out-of-sample splits.
- Research stages: gather facts -> compute deterministic metrics -> retrieve source-backed context -> draft summary -> adversarial evidence review -> schema validation -> persist report. Model must not fabricate prices, timestamps, URLs, or sources.
- Treat news/webpage content as untrusted data. It must never override system policy, access tools, or cause secrets to be revealed.

## 5. AI response schema
Each report must include symbol, generatedAt, marketDataAsOf, source list, neutral summary, observed metrics, conflicting evidence, uncertainty, stale/missing data, limitations, modelVersion and promptVersion. Reject responses that omit provenance or include executable trade instructions.

## 6. API and UI
- /api/market: public market snapshot and indicators, no secrets; no-store or deliberate short cache.
- /api/research: authenticated, read-only report; validate symbol/timeframe and enforce role policies.
- /api/auth/*: Auth.js endpoints and dedicated registration/verification/reset/MFA routes with strict schemas and throttling.
- Mutation endpoints: CSRF/origin checks where applicable, authorization, rate limits, audit events, idempotency for token consumption.
- UI states: loading, stale, partial failure, no data, disconnected stream and provider rate limit. Display last updated and source.
- Never claim millisecond freshness unless observed and measured; browser refresh cadence is not exchange latency.

## 7. Delivery and operations
- CI: typecheck, lint, unit tests, Prisma schema validation, production build, dependency/security scanning and secret scanning.
- Deploy only after CI is green. Run prisma migrate deploy as a controlled release step; never use db push against production.
- Separate development/preview/production databases and OAuth callback URLs. Production secrets only in deployment environment, never Git.
- Configure health/readiness endpoints, structured redacted logs, alerting for ingestion lag/auth failures, backup/restore drills and incident response.
- Use least privilege and a rollback plan. Do not mark production-ready until provider setup and end-to-end flows have been tested.

## 8. Required secrets (names only)
DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, APP_URL, EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM, TOKEN_ENCRYPTION_KEY, RATE_LIMIT_REDIS_URL, RATE_LIMIT_REDIS_TOKEN. Never commit values. Google OAuth and email delivery require operator-provisioned credentials.

## 9. Acceptance criteria
1. Google sign-in works only with verified provider identity and safe account linking.
2. Password signup requires email verification before normal access.
3. Password reset and verification tokens are single-use, hashed at rest and expire.
4. TOTP enrollment, challenge, recovery codes and disable flow require re-authentication.
5. RBAC is enforced server-side with negative tests for every role.
6. Sessions can be revoked; account suspension blocks access.
7. Public market data shows source and freshness; ingestion failures are visible.
8. Research reports are provenance-backed and schema-validated.
9. No order-execution path or actionable leveraged trade instructions exist.
10. Deployment, provider credentials, migration and end-to-end smoke tests are verified before declaring complete.