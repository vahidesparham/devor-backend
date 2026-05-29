# Global Admin API Base (Express + Prisma + MySQL)

Production-ready Node.js admin API scaffold using Express (CommonJS), Prisma/MySQL, Zod validation, JWT auth with refresh tokens, RBAC, audit logging, and centralized error handling.

## 1. Install

```bash
npm install
```

## 2. Configure env

```bash
cp .env.example .env
```

Update values in `.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

## 3. Prisma generate + migrate

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 4. Seed initial super admin

```bash
npm run seed
```

## 5. Run in dev

```bash
npm run dev
```

Server starts at `http://localhost:3001` with the provided `.env`.

## API routes

### Auth
- `POST /v1/admin/auth/login`
- `POST /v1/admin/auth/refresh`
- `POST /v1/admin/auth/logout`
- `GET /v1/admin/me`

### Languages
- `GET /v1/admin/languages`
- `POST /v1/admin/languages`
- `PATCH /v1/admin/languages/:id`
- `DELETE /v1/admin/languages/:id`

## Response format

### Success
```json
{
  "ok": true,
  "code": "...",
  "message": null,
  "data": {},
  "meta": null,
  "errors": null,
  "traceId": "..."
}
```

### Error
```json
{
  "ok": false,
  "code": "...",
  "message": "...",
  "data": null,
  "meta": null,
  "errors": [
    { "path": "...", "message": "..." }
  ],
  "traceId": "..."
}
```

## Notes
- `x-trace-id` is set on every response.
- Auth routes are rate-limited.
- Error logs are persisted in `ErrorLog` (with skip rules in env).
- Audit logs are persisted in `AuditLog` for login/logout and admin mutations.
- Sensitive fields (password/token/secret) are redacted before logging.
