import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Helpers de horario: minutos desde medianoche.
const H = (hora: number) => hora * 60;

async function main() {
  // ── Administrador general de la plataforma ──
  const passwordHash = await bcrypt.hash("admin1234", 10);

  const adminGeneral = await prisma.usuario.upsert({
    where: { email: "admin@turnosfutbol.com" },
    update: {},
    create: {
      email: "admin@turnosfutbol.com",
      nombre: "Admin General",
      rol: "ADMIN_GENERAL",
      passwordHash,
    },
  });

  // ── Admin del complejo demo ──
  const adminComplejo = await prisma.usuario.upsert({
    where: { email: "pibes@turnosfutbol.com" },
    update: {},
    create: {
      email: "pibes@turnosfutbol.com",
      nombre: "Dueño Los Pibes",
      rol: "ADMIN_COMPLEJO",
      passwordHash,
    },
  });

  // ── Complejo demo ──
  const complejo = await prisma.complejo.upsert({
    where: { slug: "complejo-los-pibes" },
    update: {},
    create: {
      slug: "complejo-los-pibes",
      nombre: "Complejo Los Pibes",
      descripcion: "Canchas de fútbol 5 y 7 con césped sintético e iluminación.",
      direccion: "Av. Siempre Viva 742",
      ciudad: "La Plata",
      telefono: "221-555-0100",
      whatsapp: "5492215550100",
      email: "contacto@lospibes.com",
    },
  });

  // Vincular al admin del complejo (idempotente por @@unique).
  await prisma.complejoUsuario.upsert({
    where: {
      usuarioId_complejoId: {
        usuarioId: adminComplejo.id,
        complejoId: complejo.id,
      },
    },
    update: {},
    create: {
      usuarioId: adminComplejo.id,
      complejoId: complejo.id,
      rol: "ADMIN_COMPLEJO",
    },
  });

  // ── Canchas + horarios + precios (solo si el complejo no tiene canchas) ──
  const canchasExistentes = await prisma.cancha.count({
    where: { complejoId: complejo.id },
  });

  if (canchasExistentes === 0) {
    const definiciones = [
      { nombre: "Cancha 1", tipo: "F5" as const, precioBase: 30000 },
      { nombre: "Cancha 2", tipo: "F5" as const, precioBase: 30000 },
      { nombre: "Cancha 3", tipo: "F7" as const, precioBase: 40000 },
    ];

    for (const def of definiciones) {
      const cancha = await prisma.cancha.create({
        data: {
          complejoId: complejo.id,
          nombre: def.nombre,
          tipo: def.tipo,
          superficie: "Césped sintético",
          techada: false,
          precioBase: def.precioBase,
        },
      });

      // Horarios: Lun–Vie 18–24, Sáb 10–24, Dom 16–23. Turnos de 60 min.
      const horarios = [
        ...[1, 2, 3, 4, 5].map((dia) => ({
          diaSemana: dia,
          aperturaMin: H(18),
          cierreMin: H(24),
        })),
        { diaSemana: 6, aperturaMin: H(10), cierreMin: H(24) },
        { diaSemana: 0, aperturaMin: H(16), cierreMin: H(23) },
      ];

      await prisma.horarioAtencion.createMany({
        data: horarios.map((h) => ({
          canchaId: cancha.id,
          diaSemana: h.diaSemana,
          aperturaMin: h.aperturaMin,
          cierreMin: h.cierreMin,
          minutosTurno: 60,
        })),
      });

      // Precio especial de viernes (día 5): más caro, mayor prioridad.
      await prisma.reglaPrecio.create({
        data: {
          canchaId: cancha.id,
          diaSemana: 5,
          precio: def.precioBase + 5000,
          prioridad: 1,
        },
      });
    }
  }

  console.log("Seed completado:");
  console.log("  Admin general:  admin@turnosfutbol.com / admin1234");
  console.log("  Admin complejo: pibes@turnosfutbol.com / admin1234");
  console.log(`  Complejo demo:  ${complejo.nombre} (/cancha/${complejo.slug})`);
  console.log({ adminGeneral: adminGeneral.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
