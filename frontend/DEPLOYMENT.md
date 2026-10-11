# Frontend deployment

The frontend is a Next.js server-rendered application. Deploy it as a Vercel
project after the backend has a public HTTPS URL.

## Vercel project settings

- Import the `bolivar-oportunidades` GitHub repository.
- Set **Root Directory** to `frontend`.
- Keep the detected framework preset as **Next.js**.
- Keep the default install, build, and output settings.
- Use Node.js 20 or newer.

## Required environment variable

Configure this value for both Preview and Production:

```env
API_INTERNAL_URL=https://your-backend.example.com
```

Do not add `/api` or a trailing slash. This value is server-only and must not be
renamed to use the `NEXT_PUBLIC_` prefix.

The application uses it in two places:

1. Server Components fetch public opportunities directly from the API.
2. Next.js rewrites browser requests from `/api/*` to the backend, preserving a
   same-origin browser flow for the session cookie.

Production builds fail when the variable is missing or is not an HTTP(S) URL,
preventing a deployment that silently points to localhost.

## Backend coordination

Set the backend `FRONTEND_URL` to the stable Vercel URL, for example:

```env
FRONTEND_URL=https://bolivar-oportunidades.vercel.app
COOKIE_SECURE=true
```

The backend currently accepts one frontend origin. Use the stable staging URL
for complete login, registration, publishing, and application review. Arbitrary
pull-request preview URLs require a future backend origin allowlist.

## Verification

Before pushing a deployment, run from the repository root:

```bash
npm run lint
npm run typecheck
npm run build
```
