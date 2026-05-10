import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";

const SESSION_COOKIE = "cdm_session";
const SESSION_DAYS = 60;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (16+ caractères requis).",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  avatar_style: string;
  avatar_seed: string | null;
};

type JwtPayload = { sub: string };

async function signSession(userId: string) {
  return await new SignJWT({} satisfies Record<string, never>)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

async function verifySession(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await signSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  return await queryOne<SessionUser>(
    `select id::text, email, display_name, is_admin, avatar_style, avatar_seed
       from profiles
       where id = $1`,
    [payload.sub],
  );
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/dashboard");
  return user;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function findUserByEmail(email: string) {
  return await queryOne<{
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
    is_admin: boolean;
  }>(
    `select id::text, email, display_name, password_hash, is_admin
       from profiles
       where lower(email) = lower($1)`,
    [email],
  );
}

export async function createUser(input: {
  email: string;
  displayName: string;
  password: string;
}) {
  const password_hash = await hashPassword(input.password);
  const existingCount = await queryOne<{ count: string }>(
    "select count(*)::text as count from profiles",
  );
  const isFirstUser = (existingCount?.count ?? "0") === "0";

  const row = await queryOne<{ id: string }>(
    `insert into profiles (email, display_name, password_hash, is_admin)
       values ($1, $2, $3, $4)
       returning id::text`,
    [input.email, input.displayName, password_hash, isFirstUser],
  );
  if (!row) throw new Error("Échec de création de l'utilisateur");
  return { id: row.id, isAdmin: isFirstUser };
}

export async function listFamily(): Promise<
  { id: string; display_name: string }[]
> {
  return await query<{ id: string; display_name: string }>(
    `select id::text, display_name from profiles order by display_name asc`,
  );
}
