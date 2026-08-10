# TurnosFutbol

Sistema web multi-tenant para **gestión y reserva de turnos de canchas de
fútbol**, pensado para Argentina. Los jugadores encuentran una cancha, ven la
disponibilidad y reservan; cada complejo administra sus canchas, horarios,
precios y reservas desde su propio panel.

> Estado: **en desarrollo (V1)**. Ver el diseño completo en
> [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL (Neon) · Prisma · Auth.js v5 ·
Tailwind CSS v4 + shadcn/ui · Cloudinary · desplegado en Vercel.

## Desarrollo

Requisitos: Node.js 20.9+ (probado con Node 24).

```bash
npm install
cp .env.example .env      # completar las variables
npm run dev               # http://localhost:3000
```

### Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |

## Estructura

```
src/app/        Rutas (App Router): sitio público + panel admin
docs/           Documentación de arquitectura
```
