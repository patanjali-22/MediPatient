# MediPatient Frontend

React (Vite) UI for the MediPatient microservices backend.

## What it talks to
All requests go through the **API Gateway**:
- `POST /auth/login`
- `GET /api/patients`
- `POST /api/patients`
- `PUT /api/patients/{id}`
- `DELETE /api/patients/{id}`

## Local development
This frontend uses a dev proxy so you can call `/auth/*` and `/api/*` from the browser without CORS.

### Prereqs
- Node 18+
- Backend running (gateway on `http://localhost:4004`)

### Run
- Install deps: `npm install`
- Start dev server: `npm run dev`

Open: http://localhost:5173

Default credentials (from integration tests):
- `testuser@test.com`
- `password123`

## Production / LocalStack ALB
Set `VITE_API_BASE_URL` to an absolute URL (example in `.env.example`) and then build:
- `npm run build`
- `npm run preview`
