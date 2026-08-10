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
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-neutral-500">Ingresá con tus credenciales</p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          Email o contraseña incorrectos.
        </p>
      ) : null}

      <form action={login} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Ingresar
        </button>
      </form>
    </main>
  );
}
