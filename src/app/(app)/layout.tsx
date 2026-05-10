import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await clearSessionCookie();
  redirect("/login");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand-dark">
            <span className="text-2xl">🏆</span>
            <span className="hidden sm:inline">CDM 2026 — Famille</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-3">
            <NavLink href="/dashboard" label="Accueil" />
            <NavLink href="/predictions/groups" label="Poules" />
            <NavLink href="/predictions/carre" label="Carré d'As" />
            <NavLink href="/predictions/knockout" label="Élim." />
            <NavLink href="/leaderboard" label="Classement" />
            <NavLink href="/aide" label="Aide" />
            {user.is_admin ? <NavLink href="/admin" label="Admin" /> : null}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100"
              title={`Connecté : ${user.display_name}`}
            >
              <Avatar
                style={user.avatar_style}
                seed={user.avatar_seed ?? user.display_name}
                size="sm"
                alt={user.display_name}
              />
              <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                {user.display_name}
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                title="Se déconnecter"
              >
                ⎋
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1.5 font-medium text-slate-700 transition hover:bg-brand/10 hover:text-brand-dark sm:px-3"
    >
      {label}
    </Link>
  );
}
