-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN_GENERAL', 'ADMIN_COMPLEJO');

-- CreateEnum
CREATE TYPE "TipoCancha" AS ENUM ('F5', 'F7', 'F11');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "TipoReserva" AS ENUM ('RESERVA', 'BLOQUEO');

-- CreateEnum
CREATE TYPE "OrigenReserva" AS ENUM ('WEB', 'MANUAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complejos" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "telefono" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complejos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complejo_usuarios" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "complejo_id" UUID NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN_COMPLEJO',

    CONSTRAINT "complejo_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canchas" (
    "id" UUID NOT NULL,
    "complejo_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCancha" NOT NULL,
    "superficie" TEXT,
    "techada" BOOLEAN NOT NULL DEFAULT false,
    "descripcion" TEXT,
    "precio_base" DECIMAL(10,2),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canchas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancha_fotos" (
    "id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "posicion" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "cancha_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_atencion" (
    "id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "dia_semana" SMALLINT NOT NULL,
    "apertura_min" SMALLINT NOT NULL,
    "cierre_min" SMALLINT NOT NULL,
    "minutos_turno" SMALLINT NOT NULL,

    CONSTRAINT "horarios_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_precio" (
    "id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "dia_semana" SMALLINT,
    "inicio_min" SMALLINT,
    "fin_min" SMALLINT,
    "precio" DECIMAL(10,2) NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reglas_precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "token" UUID NOT NULL,
    "complejo_id" UUID NOT NULL,
    "cancha_id" UUID NOT NULL,
    "inicia_en" TIMESTAMPTZ(6) NOT NULL,
    "termina_en" TIMESTAMPTZ(6) NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'CONFIRMADA',
    "tipo" "TipoReserva" NOT NULL DEFAULT 'RESERVA',
    "precio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cliente_nombre" TEXT,
    "cliente_apellido" TEXT,
    "cliente_telefono" TEXT,
    "cliente_email" TEXT,
    "origen" "OrigenReserva" NOT NULL DEFAULT 'WEB',
    "creada_por_id" UUID,
    "motivo_bloqueo" TEXT,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_en" TIMESTAMPTZ(6),
    "motivo_cancelacion" TEXT,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "complejos_slug_key" ON "complejos"("slug");

-- CreateIndex
CREATE INDEX "complejos_ciudad_idx" ON "complejos"("ciudad");

-- CreateIndex
CREATE INDEX "complejos_activo_idx" ON "complejos"("activo");

-- CreateIndex
CREATE INDEX "complejo_usuarios_complejo_id_idx" ON "complejo_usuarios"("complejo_id");

-- CreateIndex
CREATE UNIQUE INDEX "complejo_usuarios_usuario_id_complejo_id_key" ON "complejo_usuarios"("usuario_id", "complejo_id");

-- CreateIndex
CREATE INDEX "canchas_complejo_id_activa_idx" ON "canchas"("complejo_id", "activa");

-- CreateIndex
CREATE INDEX "cancha_fotos_cancha_id_idx" ON "cancha_fotos"("cancha_id");

-- CreateIndex
CREATE INDEX "horarios_atencion_cancha_id_dia_semana_idx" ON "horarios_atencion"("cancha_id", "dia_semana");

-- CreateIndex
CREATE INDEX "reglas_precio_cancha_id_idx" ON "reglas_precio"("cancha_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_token_key" ON "reservas"("token");

-- CreateIndex
CREATE INDEX "reservas_cancha_id_inicia_en_idx" ON "reservas"("cancha_id", "inicia_en");

-- CreateIndex
CREATE INDEX "reservas_complejo_id_idx" ON "reservas"("complejo_id");

-- AddForeignKey
ALTER TABLE "complejo_usuarios" ADD CONSTRAINT "complejo_usuarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complejo_usuarios" ADD CONSTRAINT "complejo_usuarios_complejo_id_fkey" FOREIGN KEY ("complejo_id") REFERENCES "complejos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canchas" ADD CONSTRAINT "canchas_complejo_id_fkey" FOREIGN KEY ("complejo_id") REFERENCES "complejos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancha_fotos" ADD CONSTRAINT "cancha_fotos_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_atencion" ADD CONSTRAINT "horarios_atencion_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_precio" ADD CONSTRAINT "reglas_precio_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_complejo_id_fkey" FOREIGN KEY ("complejo_id") REFERENCES "complejos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "canchas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_creada_por_id_fkey" FOREIGN KEY ("creada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────── Anti-superposición ───────────────────────────
-- Garantía a nivel de base de datos: dos reservas o bloqueos de la MISMA cancha
-- no pueden solaparse en el tiempo mientras no estén canceladas. Cubre reservas
-- web, manuales y bloqueos por igual. tstzrange usa límites '[)' (inicio
-- inclusivo, fin exclusivo), así 18:00–19:00 y 19:00–20:00 NO se solapan.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_superposicion"
  EXCLUDE USING gist (
    "cancha_id" WITH =,
    tstzrange("inicia_en", "termina_en") WITH &&
  ) WHERE ("estado" <> 'CANCELADA');
