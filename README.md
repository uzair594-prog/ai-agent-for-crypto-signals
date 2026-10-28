# Crypto Market Intelligence

Educational crypto market-data dashboard built with Next.js 15, TypeScript, PostgreSQL/Neon and Prisma.

## Current scope

- Public MEXC market data and indicator summaries.
- Historical educational analysis and transparent paper-only backtesting.
- Auth.js Google OAuth and email/password identity flows.
- Email verification and password reset using one-time hashed tokens.
- TOTP MFA with recovery codes.
- Server-side RBAC helpers, session-version checks, audit events and distributed rate-limit integration.
- Production architecture and AI research prompts under docs/ and prompts/.

## Safety boundary

This is a read-only research application. It does not create actionable leveraged futures LONG/SHORT calls, exact entry/stop-loss/take-profit instructions, live position sizing, or real exchange orders. Do not add private exchange trading credentials or order-execution routes.

## Local setup

1. Use Node.js 22.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and configure the required values.
4. Generate secrets locally; never commit them.
5. Validate the Prisma schema with `npm run db:validate`.
6. Generate the Prisma client with `npm run db:generate`.
7. Apply a reviewed migration to a development database before starting the app.
8. Run `npm run dev`.

## Required operator configuration

- Neon PostgreSQL connection string in DATABASE_URL.
- AUTH_SECRET.
- Google OAuth client ID/secret and exact callback URL: /api/auth/callback/google.
- Resend API key and verified EMAIL_FROM sender.
- A 32-byte base64 TOKEN_ENCRYPTION_KEY.
- RATE_LIMIT_REDIS_URL and RATE_LIMIT_REDIS_TOKEN for production auth rate limiting.
- A reviewed Prisma migration deployed to the target database.

The repository contains environment-variable names only. No credentials are included. Google sign-in, transactional email and production distributed rate limiting will not function until their providers are configured.

## Security notes

- Google OAuth accounts are not automatically linked to password accounts by matching email alone.
- Passwords are hashed with Argon2id. Verification and reset tokens are stored as SHA-256 hashes and expire.
- TOTP secrets are encrypted using AES-256-GCM; keep TOKEN_ENCRYPTION_KEY outside the database and rotate it using a documented migration procedure.
- RBAC must be applied in every API route/server action; middleware is only an additional page-level gate.
- Review the architecture spec and test flows before production use.

## Documentation

- [Architecture specification](docs/ARCHITECTURE.md)
- [Read-only research system prompt](prompts/READ_ONLY_RESEARCH_SYSTEM.md)
- [Unified master prompt](prompts/UNIFIED_MASTER_PROMPT.md)
