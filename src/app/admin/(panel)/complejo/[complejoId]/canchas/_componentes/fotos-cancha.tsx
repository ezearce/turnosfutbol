"use client";

import { useActionState } from "react";
import Image from "next/image";
import { MensajeError, BotonEnviar } from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";
import { agregarFotoCancha, quitarFotoCancha } from "../acciones";

type Foto = { id: string; url: string };

type AccionSubir = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

export function FotosCancha({
  complejoId,
  canchaId,
  fotos,
}: {
  complejoId: string;
  canchaId: string;
  fotos: Foto[];
}) {
  const [estado, action, pending] = useActionState<EstadoFormulario, FormData>(
    agregarFotoCancha as AccionSubir,
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      {fotos.length === 0 ? (
        <p className="text-sm text-marca-marron">
          Todavía no cargaste fotos. La primera se usa como portada.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((f, i) => (
            <li
              key={f.id}
              className="group relative aspect-video overflow-hidden rounded-lg border border-marca-borde bg-marca-superficie"
            >
              <Image
                src={f.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
              />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-marca-verde px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Portada
                </span>
              ) : null}
              <form
                action={quitarFotoCancha}
                className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <input type="hidden" name="complejoId" value={complejoId} />
                <input type="hidden" name="canchaId" value={canchaId} />
                <input type="hidden" name="fotoId" value={f.id} />
                <button
                  type="submit"
                  aria-label="Quitar foto"
                  className="rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  Quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="complejoId" value={complejoId} />
        <input type="hidden" name="canchaId" value={canchaId} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Agregar foto (JPG/PNG, hasta 5 MB)
          <input
            type="file"
            name="foto"
            accept="image/*"
            required
            className="text-sm text-marca-texto file:mr-3 file:rounded-md file:border-0 file:bg-marca-verde file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-marca-verde-oscuro"
          />
        </label>
        <MensajeError>{estado?.error}</MensajeError>
        <div>
          <BotonEnviar pending={pending}>Subir foto</BotonEnviar>
        </div>
      </form>
    </div>
  );
}
