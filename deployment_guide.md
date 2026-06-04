# Production Deployment Guide: Global Leaderboard Game

This guide outlines the steps required to deploy the Global Leaderboard Game (Frontend, Backend, PostgreSQL) publicly.

---

## Option A: PaaS Deployment (Recommended - Railway or Render)

PaaS providers are the easiest way to deploy multi-service applications with minimal infrastructure overhead.

### Step 1: Deploy PostgreSQL Database
1. Create a new project in **Railway** or **Render**.
2. Click **New Service** -> **Database** -> **Add PostgreSQL**.
3. Copy the database connection details once provisioned.

### Step 2: Deploy Spring Boot Backend
1. Link your GitHub repository.
2. Create a new Web Service pointing to the root `/backend` folder (or specify root directory: `backend`).
3. Set the build command to use the `backend/Dockerfile` (Railway and Render automatically detect the Dockerfile).
4. Configure the following environment variables:
   - `DB_HOST`: Your provisioned PostgreSQL host (e.g. `db.railway.internal`).
   - `DB_PORT`: `5432`
   - `DB_NAME`: Your database name (e.g. `railway`).
   - `DB_USER`: Your database username (e.g. `postgres`).
   - `DB_PASS`: Your database password.
5. Deploy. You will receive a backend public URL (e.g. `https://speeder-backend.up.railway.app`).

### Step 3: Deploy React Frontend
1. Create a new Web Service pointing to the root `/frontend` folder.
2. The service will build and serve using `frontend/Dockerfile` (hosting on Nginx).
3. Configure the following environment variable during build:
   - `VITE_API_URL`: Set this to your backend public URL (e.g., `https://speeder-backend.up.railway.app`).
4. Deploy. You will receive a frontend public URL (e.g. `https://speeder-game.up.railway.app`).

---

## Option B: Virtual Private Server (VPS) Deployment (Self-Hosted via Docker Compose)

If you are hosting on DigitalOcean, Linode, AWS EC2, or Hetzner:

### Step 1: Install Docker & Docker Compose
Connect to your VPS via SSH and install Docker:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
```

### Step 2: Clone & Configure
1. Clone the repository onto your VPS.
2. Navigate to the root directory.
3. Edit the `VITE_API_URL` environment variable inside the `frontend` service in `docker-compose.yml` to point to your VPS domain name (e.g. `http://game.yourdomain.com:8080` or with SSL configuration `https://api.yourdomain.com`).

### Step 3: Start Stack
Run the standard docker-compose command:
```bash
sudo docker compose up -d --build
```
This will compile and launch the Nginx frontend (port 80), Spring Boot backend (port 8080), and PostgreSQL (port 5432) in detached background mode.

---

## Configuring Custom Subdomain (game.yourdomain.com)

To link your custom domain:

1. **DNS Management**: Go to your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy).
2. **Add DNS Records**:
   - **Frontend**: Add a `CNAME` record mapping your subdomain `game` to your frontend host domain (e.g. `speeder-game.up.railway.app` or VPS A Record).
     - Type: `CNAME`
     - Host: `game`
     - Value: `speeder-react-frontend.railway.app`
     - TTL: `Automatic` / `3600`
   - **Backend**: Add a `CNAME` record mapping `api` to your backend host domain.
     - Type: `CNAME`
     - Host: `api`
     - Value: `speeder-spring-backend.railway.app`
3. **SSL Certificate**: Railway, Render, and Cloudflare automatically provision free SSL (HTTPS) certificates for custom domains.
