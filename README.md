# Hireasy Backend

Express + TypeScript + MongoDB API for worker, company, job, application, document verification, and admin management flows.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set `MONGO_URI` and `JWT_SECRET`.
3. Seed the first admin:
   ```bash
   npm run seed:admin
   ```
4. Run the API:
   ```bash
   npm run dev
   ```

The API defaults to `http://localhost:5050`.

## Admin Panel

Open `admin-panel/index.html` in a browser. It expects the API at `http://localhost:5050` by default. To point it elsewhere, set this in the browser console before reload:

```js
localStorage.setItem("hireasy_api_base", "http://your-api-host");
```

## Main Routes

Auth/mobile:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/me/profile-picture`
- `POST /api/auth/me/document`
- `GET /api/auth/me/document/download`
- `DELETE /api/auth/me/document`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/:jobId/apply`
- `GET /api/jobs/me/applications`

Admin:

- `POST /api/admin/auth/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/companies`
- `GET /api/admin/companies/:id`
- `PATCH /api/admin/companies/:id/status`
- `PATCH /api/admin/companies/:id`
- `GET /api/admin/documents/pending`
- `GET /api/admin/users/:id/document/download`
- `PATCH /api/admin/users/:id/document/approve`
- `PATCH /api/admin/users/:id/document/reject`
- `GET /api/admin/jobs`
- `GET /api/admin/jobs/:id`
- `PATCH /api/admin/jobs/:id/status`
- `PATCH /api/admin/jobs/:id`
- `DELETE /api/admin/jobs/:id`
- `GET /api/admin/applications`
- `PATCH /api/admin/jobs/:jobId/applications/:workerId/status`
- `GET /api/admin/audit-logs`

All admin routes except login require `Authorization: Bearer <admin-token>`.

## Security Notes

- Passwords are hashed with bcrypt.
- JWT auth protects private and admin routes.
- Admin middleware verifies `role: "admin"`.
- Login/register endpoints have in-memory rate limits.
- Password hashes are excluded from API responses.
- User/company documents are downloaded through authenticated routes instead of public static hosting.
- CORS origins are configured with `CORS_ORIGINS`.
