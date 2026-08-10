import { disponibilidadCancha } from "@/lib/disponibilidad";
import { esFechaISOValida } from "@/lib/zona";

// GET /api/availability?canchaId=<uuid>&fecha=YYYY-MM-DD
// Público: devuelve los slots (con estado y precio) de una cancha para un día.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const canchaId = searchParams.get("canchaId");
  const fecha = searchParams.get("fecha");

  if (!canchaId) {
    return Response.json({ error: "Falta canchaId." }, { status: 400 });
  }
  if (!fecha || !esFechaISOValida(fecha)) {
    return Response.json(
      { error: "Falta fecha válida (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const slots = await disponibilidadCancha(canchaId, fecha);
  return Response.json({ canchaId, fecha, slots });
}
