import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    // signIn lanza un redirect en caso de éxito: hay que dejarlo propagar.
    if (error instanceof AuthError) {
      redirect("/admin/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const { error } = await props.searchParams;

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-marca-crema px-6 py-12 text-marca-texto">
      <div className="w-full max-w-sm rounded-2xl border border-marca-borde bg-marca-superficie p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <p className="flex items-center justify-center gap-1.5 text-lg font-bold text-marca-verde">
            <span aria-hidden>⚽</span> TurnosFutbol
          </p>
          <h1 className="text-xl font-bold">Panel de administración</h1>
          <p className="text-sm text-marca-marron">Ingresá con tus credenciales</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            Email o contraseña incorrectos.
          </p>
        ) : null}

        <form action={login} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-marca-borde bg-marca-superficie px-3 py-2 font-normal outline-none transition-colors focus:border-marca-verde focus:ring-2 focus:ring-marca-verde/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Contraseña
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-marca-borde bg-marca-superficie px-3 py-2 font-normal outline-none transition-colors focus:border-marca-verde focus:ring-2 focus:ring-marca-verde/20"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-marca-verde px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
          >
            Ingresar
          </button>
        </form>
      </div>
    </main>
  );
}
