# Tarjetas digitales B2B (QR)

Web/PWA con **perfiles públicos**, **QR**, **vCard**, y un **panel multi‑tenant** para empresas (roles, invitaciones, marca, desactivar/reasignar tarjetas).

## Requisitos

- Node.js 20+
- **Postgres** accesible con una `DATABASE_URL` válida (local o en la nube)

## Si ves `command not found: docker`

Eso significa que **Docker no está instalado** (o no está en el `PATH`). Tienes tres caminos:

### A) Instalar Docker Desktop (recomendado si quieres el `docker compose` del repo)

1. Descarga e instala [Docker Desktop para Mac](https://www.docker.com/products/docker-desktop/).
2. O con Homebrew:

```bash
brew install --cask docker
```

3. Abre la app **Docker** al menos una vez y espera a que diga que está en ejecución.
4. Verifica:

```bash
docker --version
docker compose version
```

Luego ya puedes usar `docker compose up -d` en la carpeta del proyecto.

### B) Postgres en la nube (sin Docker)

Servicios como [Neon](https://neon.tech) o [Supabase](https://supabase.com) te dan una `DATABASE_URL`. Cópiala en tu `.env` como `DATABASE_URL=...` y salta el paso de Docker.

### C) Postgres solo con Homebrew (sin Docker Desktop)

```bash
brew install postgresql@16
brew services start postgresql@16
createuser -s postgres || true
createdb cardhub || true
```

Ajusta `.env` (ejemplo):

```bash
DATABASE_URL="postgresql://$(whoami)@localhost:5432/cardhub?schema=public"
```

(Crea usuario/clave según tu configuración local si hace falta.)

## Configuración local

1. Copia variables de entorno:

```bash
cp .env.example .env
```

2. Asegura Postgres y `DATABASE_URL` en `.env` (Docker **o** nube **o** Postgres local, según arriba).

   Si usas Docker y ya está instalado:

```bash
docker compose up -d
```

3. Aplica migraciones y seed:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

4. Arranca la app:

```bash
npm run dev
```

Abre `http://localhost:3000`.

### Demo (seed)

- Email: `admin@example.com`
- Contraseña: `password123`
- Organización: `acme`
- Tarjeta pública: `/card/acme/ventas-001`

## API móvil (JWT)

- `POST /api/v1/auth/login` → `{ access_token, token_type, expires_in }`
- `GET /api/v1/me` con header `Authorization: Bearer <token>`
- `GET /api/v1/organizations/:orgSlug/profiles`
- OpenAPI:
  - `GET /api/v1/openapi` (YAML)
  - `GET /openapi.yaml` (archivo estático en `public/`)

Configura `JWT_SECRET` (mín. 16 caracteres).

## Despliegue (producción)

### App (Vercel u otro)

- Build: `npm run build`
- Start: `npm run start`
- Variables: `DATABASE_URL`, `AUTH_SECRET` (o `NEXTAUTH_SECRET`), `JWT_SECRET`, y en producción `AUTH_URL` (o `NEXTAUTH_URL`) con la URL canónica del sitio. En local puedes omitir la URL de Auth y usar `AUTH_TRUST_HOST=true` (ver `.env.example`).

### Base de datos

- Postgres administrado (Neon, Supabase, RDS, etc.)
- Ejecuta migraciones en CI/CD: `npx prisma migrate deploy`

### Archivos (logos/fotos)

El MVP usa **URLs** (por ejemplo un bucket S3/R2/Supabase Storage + CDN). Pega el enlace en el panel de marca o en la tarjeta.

### Backups

Activa backups automáticos en tu proveedor de Postgres y prueba restauración periódicamente.

## Prisma 7 + Postgres

Este proyecto usa el **driver adapter** `@prisma/adapter-pg` (ver `src/lib/prisma.ts`).

## Scripts útiles

- `npm run db:migrate` — migraciones en desarrollo
- `npm run db:studio` — Prisma Studio
- `npm run db:seed` — datos demo
