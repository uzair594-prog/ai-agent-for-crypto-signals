# Deployment and Production Readiness Checklist

This application is intentionally read-only. It must not store exchange trading credentials, generate actionable leveraged trade instructions, or submit exchange orders.

## 1. Connect the repository to Vercel
1. In Vercel, open the intended team and choose **Add New → Project**.
2. Ensure the GitHub Vercel App installation has access to `uzair594-prog/ai-agent-for-crypto-signals` (repository is public, but Vercel still needs permission to link its Git source).
3. Select `main`, root directory `./`, framework Next.js, and Node.js 20 or 22.
4. Do not point this app at another site's project or reuse another site's environment variables.
5. Keep production protected until the acceptance checks below pass.

## 2. Environment variables
Set these in the new Vercel project for the correct environments. Never put secret values in GitHub files or issue comments.

| Variable | Required for | How to obtain |
| --- | --- | --- |
| `DATABASE_URL` | Prisma/PostgreSQL | Neon pooled or direct connection string with SSL; use a dedicated app database/branch |
| `AUTH_SECRET` | Auth.js | Generate a fresh random secret (at least 32 bytes); do not reuse a CI value |
| `AUTH_GOOGLE_ID` | Google sign-in | Google Cloud OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google sign-in | Google Cloud OAuth client secret |
| `APP_URL` | Origin checks and links | Canonical deployed HTTPS origin, without a trailing slash |
| `RESEND_API_KEY` | Verification/reset email | Resend API key for the verified sending domain |
| `EMAIL_FROM` | Verification/reset email | Sender address verified in Resend |
| `TOKEN_ENCRYPTION_KEY` | TOTP secret encryption | Base64-encoded random 32-byte key, unique to this app and environment |
| `RATE_LIMIT_REDIS_URL` | Auth rate limiting | Upstash Redis REST URL |
| `RATE_LIMIT_REDIS_TOKEN` | Auth rate limiting | Upstash Redis REST token |

Do not enable production registration until email delivery and distributed rate limiting are configured. The app deliberately fails closed for these flows if the rate limiter is missing.

## 3. Google OAuth
Add the exact callback URL to the Google OAuth client's authorized redirect URIs:
`https://YOUR_CANONICAL_DOMAIN/api/auth/callback/google`

For local development use:
`http://localhost:3000/api/auth/callback/google`

Google sign-in requires a verified Google email. Do not enable automatic linking to a pre-existing password account without a separate authenticated linking flow.

## 4. Database migration
- Create a dedicated Neon branch/database for this app; do not point it at an unrelated production database.
- Review `prisma/schema.prisma` against the target database before changing anything.
- Create and review a checked-in Prisma migration using `npx prisma migrate dev --name init` against a disposable development database.
- Run `npx prisma migrate deploy` only after the migration SQL has been reviewed and tested against a Neon branch/backup.
- Never use `prisma db push` against production. Do not run destructive SQL as a deployment shortcut.
- Confirm the deployed application can query the database and that sign-up, email verification, login, reset, MFA, and role-denial cases pass end-to-end.

## 5. Release gate
A release is not production-ready until all of these are true:
- [ ] GitHub Actions passes Prisma validation, lint, typecheck, and Next.js production build.
- [ ] The target Vercel deployment is READY and serves the expected commit.
- [ ] The canonical URL is accessible to intended users and has the intended protection policy.
- [ ] Neon schema migration completed on the correct database and rollback/restore steps are known.
- [ ] Google OAuth callback verified end-to-end.
- [ ] Verification and reset emails are delivered from the verified domain.
- [ ] MFA enrollment, first-code confirmation, login challenge, backup-code consumption, and disable/recovery behavior are tested.
- [ ] RBAC negative tests confirm ordinary users cannot perform analyst/admin/security-admin actions.
- [ ] Rate limiting is working in production; no fail-open behavior.
- [ ] Market data includes source and observation time, and stale/missing upstream data is visible.
- [ ] No exchange trading keys, private signed endpoints, or order-execution routes exist.
- [ ] A rollback plan and alerting for auth failures/data staleness are in place.

## 6. Known deployment limitation
A Vercel deployment can only be declared complete after Vercel has access to the repository and a real build is inspected. If the Git provider returns a repository access error, grant the Vercel GitHub App access to this repository and re-run project linking. Do not claim a successful deployment based only on a commit or an existing deployment from a different source.
