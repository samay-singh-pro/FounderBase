# Deploying FoundrBase (free, on Render)

The repo includes a Render **Blueprint** ([render.yaml](render.yaml)) that creates two free services:

| Service | What it is | URL (default) |
| --- | --- | --- |
| `foundrbase-api` | FastAPI backend (Python web service) | `https://foundrbase-api.onrender.com` |
| `foundrbase-web` | React frontend (static site on Render's CDN) | `https://foundrbase-web.onrender.com` |

If a name is already taken on Render, you'll get a URL with a random suffix (e.g. `foundrbase-api-x7k2.onrender.com`). Step 4 covers that.

## Know the free-tier limits

- **The API sleeps after 15 minutes without traffic.** The first request after that takes about a minute while it wakes up. The frontend is a static site and never sleeps.
- **SQLite data is temporary.** The free instance has no persistent disk, so the database file is wiped on every redeploy and restart, including when the API wakes from sleep. That's fine for a quick demo. To keep data, use a free Neon Postgres database (see [Keep data permanently](#optional-keep-data-permanently-free-postgres-on-neon)). No code changes are needed.
- **Uploaded images need Cloudinary.** Without Cloudinary keys, uploads go to the local disk and disappear the same way.
- **750 free instance hours per month, per workspace.** These are shared with any other free web service in the same Render workspace. Sleeping services don't use hours.

## 1. Push the code to GitHub

Commit and push the deployment changes to `main`. Render deploys from your GitHub repo.

## 2. Create the Blueprint

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the `founderbase` GitHub repo. Render detects `render.yaml`.
3. Render asks for the values marked `sync: false`:

| Variable | Service | What to enter |
| --- | --- | --- |
| `VITE_API_URL` | web | `https://foundrbase-api.onrender.com` (**required**, no trailing slash) |
| `CORS_ORIGINS` | api | `https://foundrbase-web.onrender.com` (or leave blank to allow any origin) |
| `DATABASE_URL` | api | Leave blank for SQLite, or paste a Neon URL (see below) |
| `GOOGLE_GEMINI_API_KEY` | api | Optional: copy from your local `backend/.env` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | api | Optional (recommended): copy from your local `backend/.env` |
| `GIPHY_API_KEY` | api | Optional: copy from your local `backend/.env` |

`SECRET_KEY` (for login tokens) is generated automatically. You don't need to set it.

4. Click **Apply**. The first build takes a few minutes.

## 3. Check that it's working

1. Open `https://<your-api-url>/health`. It should show `{"status":"ok", ...}`. The first request may take up to a minute.
2. Open the frontend URL, sign up, and log in.

## 4. If Render gave you different URLs

1. **Frontend service** → **Environment**: set `VITE_API_URL` to the real API URL. Then go to **Manual Deploy** → **Clear build cache & deploy**. The URL is built into the JavaScript, so it only takes effect after a rebuild.
2. **API service** → **Environment**: set `CORS_ORIGINS` to the real frontend URL. The API restarts on its own.

## Optional: keep data permanently (free Postgres on Neon)

[Neon](https://neon.com)'s free plan includes a Postgres database that doesn't expire and doesn't need a credit card.

1. Create a Neon project and copy its connection string (`postgresql://...?sslmode=require`).
2. **API service** → **Environment**: set `DATABASE_URL` to that string and save.

The tables are created automatically on startup. The Postgres driver is already in `requirements.txt`.

> Render's own free Postgres is deleted after 30 days, so Neon is the better free choice.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser console shows a **CORS** error | `CORS_ORIGINS` on the API must exactly match the frontend URL: `https://`, no trailing slash. |
| Requests go to `127.0.0.1:8000` | `VITE_API_URL` wasn't set when the frontend was built. Set it, then **Clear build cache & deploy**. |
| First request hangs or the page shows a network error | The API is waking up. Wait about a minute and refresh. |
| Everyone's account disappeared | Expected with SQLite on the free tier. Switch to Neon (above). |
| Uploaded images are broken after a while | Set the three `CLOUDINARY_*` variables. |
| Frontend build fails | Look at the build logs. `npm run build` runs a TypeScript check (`tsc -b`), so run `npm run build` locally first. |

## Local development

Nothing changes locally. The backend reads `backend/.env`, and the frontend falls back to `http://127.0.0.1:8000` when `VITE_API_URL` isn't set. See `backend/.env.example` and `frontend/.env.example`.
