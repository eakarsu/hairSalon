# SalonFlow Operations

SalonFlow is a multi-tenant salon and field-service operations application. It implements authoritative quote, availability, booking, dispatch, on-site work, change-order, invoice, payment, refund, cancellation, communication, and offline-recovery workflows backed by PostgreSQL.

The application does not create a database, push a schema, seed demo users, invent provider success, or use fallback secrets at startup. Production operations fail closed when their required provider or secret configuration is absent.

## Core behavior

- Exact idempotency for quotes, bookings, lifecycle commands, payments, refunds, messages, and offline commands.
- Concurrent availability protection using PostgreSQL advisory and row locks; schedule, time-off, skill/certification, station, service-area, and inventory checks are re-run when booking commits.
- Explicit appointment states from quote through dispatch, travel, partial work, completion, no-show, cancellation, and exception recovery.
- Immutable, hash-chained appointment events plus append-only provider, refund, inventory, and communication evidence.
- Licensed HTTP adapters for maps, calendar, messaging, tax, payment, and accounting. Provider calls carry bearer authentication and `Idempotency-Key`; payment/refund webhooks require HMAC signatures and reject altered replay.
- Customer access tokens are hashed at rest. Staff access is loaded from the current database record on each request. Kiosks use revocable, hashed device credentials.
- A service worker queues only explicit offline commands in IndexedDB and reports optimistic-version conflicts; authenticated pages and API responses are not put in an offline cache.
- Production startup applies checked-in migrations only. There is no destructive reset or seed path.

## Requirements

- Node.js 22
- Yarn 1.22
- PostgreSQL 14 or newer
- HTTPS provider endpoints that implement the evidence contract described below

Copy `.env.example` to `.env` and replace every required value. Generate secrets with a cryptographically secure generator; each application secret must contain at least 32 characters.

```bash
yarn install --frozen-lockfile
yarn db:migrate
yarn dev
```

`yarn dev` runs the custom Next.js/Socket.IO server. For production:

```bash
yarn build
./start.sh
```

`start.sh` validates required configuration, runs `prisma migrate deploy`, and starts the already-built server. It never installs packages, kills processes, creates databases, pushes schema changes, or seeds data.

## Provider contract

Each configured provider receives a JSON `POST` with `operation`, `sourceRef`, and operation-specific fields. It must return JSON shaped like:

```json
{
  "licensed": true,
  "provider": "provider-account-name",
  "eventId": "provider-unique-event-id",
  "operation": "PAYMENT_CAPTURE",
  "sourceRef": "A-APPOINTMENT-NUMBER",
  "status": "SUCCEEDED",
  "occurredAt": "2026-07-20T12:00:00.000Z",
  "result": {
    "paymentId": "pay_123",
    "amountCents": 10800
  }
}
```

Allowed operations are `MAP_ROUTE`, `CALENDAR_RESERVE`, `CALENDAR_RELEASE`, `MESSAGE`, `TAX_QUOTE`, `PAYMENT_AUTHORIZE`, `PAYMENT_CAPTURE`, `PAYMENT_REFUND`, `ACCOUNTING_INVOICE`, and `ACCOUNTING_PAYMENT`. The application verifies the operation/source binding, evidence shape, stable event identity, and expected result fields. Provider success is never simulated.

Payment callbacks use `POST /api/field-service/webhooks/{provider}`. Sign the exact raw request body with HMAC-SHA256 using `FIELD_WEBHOOK_SECRET` and send the hexadecimal digest in `X-Field-Signature`.

## Operational setup

1. Apply migrations with a role allowed to create tables, enums, functions, and triggers.
2. Register the first owner through the public registration flow and verify the delivered email. Public registration cannot assign staff roles.
3. Configure staff schedules, certified skills, stations/mobile units, service inventory recipes, and service areas before taking bookings.
4. Create kiosk credentials with `POST /api/kiosk/devices` as an owner or manager. The raw token is returned once; provision it into kiosk local storage and revoke unused devices through the same endpoint.
5. Configure the six provider base URLs/tokens and webhook delivery before enabling public booking.
6. Put the application behind TLS and a durable distributed rate limiter/WAF when running more than one instance. The middleware limiter is process-local and provides only a single-instance safety net.
7. Configure Redis and the Socket.IO Redis adapter packages when horizontally scaling real-time events.

## Verification

```bash
yarn typecheck
yarn lint
yarn test
yarn build
yarn audit --groups dependencies --level high
```

Integration tests require `DATABASE_URL` to point at an isolated PostgreSQL database with the checked-in migrations applied. They deliberately truncate application tables and must never target shared or production data. CI provisions its own PostgreSQL service and covers fresh migration, migration drift, concurrent overbooking, skill and inventory rejection, failure recovery, rescheduling, reassignment, partial work, refunds, cancellation, no-shows, offline conflicts, and database tamper guards.

## Deployment

`docker compose up --build` runs PostgreSQL and the application after all required values referenced in `compose.yaml` are exported. Database storage uses a named volume. The application container waits for PostgreSQL health, applies migrations once, and then starts the server.

Back up PostgreSQL outside the application container, monitor provider-event failures and appointments in `EXCEPTION`, rotate provider/kiosk credentials, and alert on calendar compensation errors because they require provider-side reconciliation.
