import Link from "next/link";
import { redirect } from "next/navigation";
import { findUserByEmail, setSessionCookie, verifyPassword } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard") || "/dashboard";

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email et mot de passe requis.")}`);
  }
  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect(`/login?error=${encodeURIComponent("Identifiants invalides.")}`);
  }
  await setSessionCookie(user.id);
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-dark">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">
          Coupe du Monde 2026 — Famille
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Mot de passe" type="password" required />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow transition hover:bg-brand-dark"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  type,
  required,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
