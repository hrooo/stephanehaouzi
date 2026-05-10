import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createUser,
  findUserByEmail,
  setSessionCookie,
} from "@/lib/auth";

async function signupAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fail = (msg: string) =>
    redirect(`/signup?error=${encodeURIComponent(msg)}`);

  if (!email.includes("@")) fail("Email invalide.");
  if (displayName.length < 2) fail("Indique ton prénom (2 caractères min).");
  if (password.length < 6) fail("Mot de passe : 6 caractères minimum.");

  if (await findUserByEmail(email)) {
    fail("Un compte existe déjà avec cet email.");
  }

  const { id } = await createUser({ email, displayName, password });
  await setSessionCookie(id);
  redirect("/dashboard");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-dark">Créer un compte</h1>
        <p className="mt-1 text-sm text-slate-600">
          Coupe du Monde 2026 — Famille
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signupAction} className="mt-6 space-y-4">
          <Field name="displayName" label="Prénom (affiché au classement)" type="text" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Mot de passe (6 caractères min.)" type="password" required />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow transition hover:bg-brand-dark"
          >
            Créer mon compte
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Se connecter
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Le 1er compte créé devient automatiquement administrateur.
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
