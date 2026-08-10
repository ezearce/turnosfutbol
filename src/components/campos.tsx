import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const claseControl =
  "rounded-md border border-marca-borde bg-white px-3 py-2 font-normal outline-none transition-colors focus:border-marca-verde focus:ring-2 focus:ring-marca-verde/20";

export function Campo({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input {...props} className={claseControl} />
    </label>
  );
}

export function CampoTextarea({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <textarea {...props} rows={3} className={claseControl} />
    </label>
  );
}

export function MensajeError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function BotonEnviar({
  children,
  pending,
}: {
  children: string;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro disabled:opacity-50"
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}
