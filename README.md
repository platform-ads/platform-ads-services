## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```
nest g resource users --no-spec
https://www.npmjs.com/package/api-query-params

## Email configuration (SMTP vs Resend)

This service supports two ways to send email:

- SMTP via `@nestjs-modules/mailer` (default)
- Resend API (recommended on Vercel serverless)

### Environment variables

- Common
	- `MAIL_FROM` — e.g. `Platform Ads <noreply@platformads.com>`
	- `CLIENT_URL` — used in email templates for links

- SMTP (default)
	- `MAIL_PROVIDER` (optional): `smtp`
	- `MAIL_HOST` — e.g. `smtp.gmail.com`
	- `MAIL_PORT` — `465` (TLS) or `587` (STARTTLS)
	- `MAIL_SECURE` — `true` for 465, `false` for 587
	- `MAIL_USER` — SMTP username
	- `MAIL_PASS` — SMTP password/app password

- Resend (recommended on Vercel)
	- `MAIL_PROVIDER` = `resend`
	- `RESEND_API_KEY` — your Resend API key

Notes:

- On Vercel, direct SMTP can fail with errors like "Greeting never received" or "Unexpected socket close" due to provider/network restrictions. Using the Resend API avoids long‑lived TCP sockets and is more reliable in serverless environments.
- SMTP transport is hardened with timeouts and STARTTLS when appropriate. Ensure `MAIL_PORT`/`MAIL_SECURE` match your provider.