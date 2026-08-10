# Arquitectura — TurnosFutbol

Sistema web multi-tenant para gestión y reserva de turnos de canchas de fútbol.
Pensado para **Argentina**: fechas en UTC (`timestamptz`), zona horaria
`America/Argentina/Buenos_Aires` (UTC−3, sin horario de verano), moneda ARS,
locale `es-AR`.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 15 (App Router) + TypeScript |
| Base de datos | PostgreSQL (Neon) |
| ORM | Prisma |
| Autenticación | Auth.js (NextAuth v5) con roles propios |
| UI | Tailwind CSS + shadcn/ui |
| Calendario admin | FullCalendar |
| Imágenes | Cloudinary |
| Emails (opcional V1) | Resend |
| Hosting | Vercel |

## Principios

- **Multi-tenant modelo "pool"**: un solo esquema, columna `complejo_id` en cada
  tabla relevante. El aislamiento se garantiza en la capa de aplicación: toda
  query de un admin filtra por el `complejo_id` de su sesión, nunca por uno que
  venga del request.
- **Disponibilidad calculada al vuelo**: no se almacena una tabla de slots. Los
  turnos libres = horarios de atención configurados − reservas activas.
- **Precio congelado**: al crear la reserva se resuelve el precio vigente y se
  guarda en la reserva. Cambiar precios a futuro no afecta reservas existentes.
- **Anti-duplicados en la base de datos**: constraint `EXCLUDE` con `btree_gist`.
  El frontend nunca es la garantía.
- **Reservas y bloqueos en la misma tabla** (`reservas.tipo` = `RESERVA` | `BLOQUEO`).

## Modelo de datos (nombres en español)

### `usuarios`
Administradores de plataforma y de complejos. Los clientes NO son usuarios en V1.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| email | text UNIQUE | login |
| password_hash | text | argon2/bcrypt |
| nombre | text | |
| rol | enum `ADMIN_GENERAL` \| `ADMIN_COMPLEJO` | |
| creado_en | timestamptz | |

### `complejos` (el tenant)

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | para `/cancha/complejo-los-pibes` |
| nombre | text | |
| descripcion | text | |
| direccion | text | |
| ciudad | text | filtro por ubicación |
| latitud, longitud | numeric | |
| telefono, whatsapp, email | text | contacto |
| activo | bool | |
| creado_en | timestamptz | |

Índices: `slug` (unique), `ciudad`, `activo`.

### `complejo_usuarios` (relación usuario ↔ complejo)

| Columna | Notas |
|---|---|
| id uuid PK | |
| usuario_id FK | |
| complejo_id FK | |
| rol | rol dentro del complejo |
| UNIQUE(usuario_id, complejo_id) | |

### `canchas`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| complejo_id | FK | |
| nombre | text | "Cancha 1" |
| tipo | enum `F5` \| `F7` \| `F11` | |
| superficie | text | césped sintético, etc. |
| techada | bool | |
| descripcion | text | |
| activa | bool | |

Índice: `(complejo_id, activa)`.

### `cancha_fotos`

`id, cancha_id FK, url, posicion`.

### `horarios_atencion`
Reglas semanales por cancha. De acá se generan los slots.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| cancha_id | FK | |
| dia_semana | smallint (0–6) | |
| hora_apertura | time | ej. 18:00 |
| hora_cierre | time | ej. 23:00 |
| minutos_turno | int | 60, 90… |

### `reglas_precio`
Precios flexibles pero acotados.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| cancha_id | FK | |
| dia_semana | smallint NULL | null = todos los días |
| hora_inicio, hora_fin | time NULL | franja opcional |
| precio | numeric(10,2) | |
| prioridad | int | resolver reglas solapadas |

Resolución: regla más específica que matchee el slot; fallback a precio base.

### `reservas` ⭐ (tabla central: reservas y bloqueos)

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| complejo_id | FK | denormalizado para filtrar rápido |
| cancha_id | FK | |
| inicia_en | timestamptz | |
| termina_en | timestamptz | |
| estado | enum `CONFIRMADA` \| `CANCELADA` \| `BLOQUEADA` | |
| tipo | enum `RESERVA` \| `BLOQUEO` | |
| precio | numeric(10,2) | snapshot al crear |
| cliente_nombre | text NULL | null si BLOQUEO |
| cliente_apellido | text NULL | |
| cliente_telefono | text NULL | |
| cliente_email | text NULL | |
| origen | enum `WEB` \| `MANUAL` | |
| creada_por | uuid NULL | admin si es manual |
| motivo_bloqueo | text NULL | mantenimiento, torneo… |
| creada_en | timestamptz | |
| cancelada_en | timestamptz NULL | |
| motivo_cancelacion | text NULL | |

Constraint anti-superposición (garantía real):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservas ADD CONSTRAINT sin_superposicion
  EXCLUDE USING gist (
    cancha_id WITH =,
    tstzrange(inicia_en, termina_en) WITH &&
  ) WHERE (estado <> 'CANCELADA');
```

Índice adicional: `(cancha_id, inicia_en)`.

## Estados de reserva (V1)

- `CONFIRMADA`: ocupa el horario. Reservas web y manuales entran directo.
- `CANCELADA`: libera el horario, no se borra (historial).
- `BLOQUEADA`: reserva con `tipo=BLOQUEO`, ocupa el horario, no es reserva de cliente.

"Disponible" no es un estado (es la ausencia de reserva). "Completada" se deriva
(`estado=CONFIRMADA` y `termina_en < now()`).

## Roles

- `ADMIN_GENERAL`: administra toda la plataforma, crea complejos y admins.
- `ADMIN_COMPLEJO`: sólo su(s) complejo(s).
- Cliente: sin cuenta en V1 (reserva como invitado). Cancela sólo el admin en V1.

## URLs

```
PÚBLICO
  /                         Home + buscador
  /canchas                  Listado con filtros
  /cancha/[slug]            Perfil del complejo + canchas
  /cancha/[slug]/reservar   Flujo de reserva
  /reserva/[token]          Confirmación

ADMIN
  /admin/login
  /admin                    Dashboard
  /admin/calendario
  /admin/canchas
  /admin/horarios
  /admin/precios
  /admin/reservas

SUPER-ADMIN
  /admin/plataforma/complejos
  /admin/plataforma/usuarios
```

## Plan por fases

- **Fase 0 — Fundaciones**: Next.js + TS + Tailwind + shadcn, Prisma + Neon,
  estructura, env, linter, deploy vacío a Vercel.
- **Fase 1 — Datos + Auth**: schema Prisma, migraciones, constraint EXCLUDE, seed,
  Auth.js con roles, protección de rutas, aislamiento por complejo_id.
- **Fase 2 — Super-admin + multi-tenant**: CRUD complejos, alta de admins.
- **Fase 3 — Config del complejo**: CRUD canchas + fotos, horarios, precios.
- **Fase 4 — Motor de disponibilidad**: generación de slots, endpoint availability.
- **Fase 5 — Reservas + concurrencia**: crear reserva (transacción + snapshot),
  reservas manuales, bloqueos, cancelación, tests de concurrencia.
- **Fase 6 — Panel admin**: dashboard, calendario, gestión desde el calendario.
- **Fase 7 — Sitio público**: home, listado, perfil, calendario público, reserva.
- **Fase 8 — Pulido + testing + notificaciones**: emails, validaciones (Zod),
  rate limiting, responsive, tests E2E.
- **Fase 9 — Deploy**: dominio, env de prod, backups, datos demo.

## Consideraciones para Argentina

- Fechas siempre en `timestamptz` (UTC) en la BD; convertir a
  `America/Argentina/Buenos_Aires` en la UI. Sin horario de verano actualmente.
- Moneda ARS, formato `es-AR` (`Intl.NumberFormat('es-AR', { currency: 'ARS' })`).
- Teléfonos en formato local argentino.
