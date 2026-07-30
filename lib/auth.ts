import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  authCredentials,
  authSessions,
  invitations,
  loginAttempts,
  users,
} from "../db/schema";

const SESSION_COOKIE = "sol_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 210_000;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken(bytes = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function validatePassword(password: string) {
  if (password.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres.");
  if (password.length > 128) throw new Error("A senha é muito longa.");
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    throw new Error("Use pelo menos uma letra e um número.");
  }
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: Uint8Array.from(salt).buffer,
    iterations,
  }, material, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function setUserPassword(userId: string, password: string) {
  validatePassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  const db = await getDb();
  await db.insert(authCredentials).values({
    userId,
    passwordHash,
    passwordSalt: bytesToBase64Url(salt),
    iterations: PASSWORD_ITERATIONS,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: authCredentials.userId,
    set: {
      passwordHash,
      passwordSalt: bytesToBase64Url(salt),
      iterations: PASSWORD_ITERATIONS,
      updatedAt: new Date().toISOString(),
    },
  }).run();
  await db.delete(authSessions).where(eq(authSessions.userId, userId)).run();
}

export async function verifyUserPassword(userId: string, password: string) {
  const db = await getDb();
  const credential = await db.select().from(authCredentials)
    .where(eq(authCredentials.userId, userId)).get();
  if (!credential) return false;
  const candidate = await derivePassword(
    password,
    base64UrlToBytes(credential.passwordSalt),
    credential.iterations,
  );
  return safeEqual(candidate, credential.passwordHash);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function sessionCookie(token: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  const db = await getDb();
  await db.insert(authSessions).values({
    id: `ses_${crypto.randomUUID()}`,
    userId,
    tokenHash: await sha256(token),
    expiresAt,
    createdAt: timestamp,
    lastSeenAt: timestamp,
  }).run();
  return token;
}

export async function sessionUser(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const db = await getDb();
  const session = await db.select().from(authSessions)
    .where(and(
      eq(authSessions.tokenHash, await sha256(token)),
      gt(authSessions.expiresAt, new Date().toISOString()),
    )).get();
  if (!session) return null;
  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user || user.status === "suspended") return null;
  await db.update(authSessions).set({ lastSeenAt: new Date().toISOString() })
    .where(eq(authSessions.id, session.id)).run();
  return user;
}

export async function destroySession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  const db = await getDb();
  await db.delete(authSessions).where(eq(authSessions.tokenHash, await sha256(token))).run();
}

export async function hasPassword(userId: string) {
  const db = await getDb();
  return Boolean(await db.select({ userId: authCredentials.userId }).from(authCredentials)
    .where(eq(authCredentials.userId, userId)).get());
}

export async function recordLoginAttempt(email: string, success: boolean) {
  const db = await getDb();
  await db.insert(loginAttempts).values({
    id: `log_${crypto.randomUUID()}`,
    email,
    success,
    createdAt: new Date().toISOString(),
  }).run();
}

export async function loginIsRateLimited(email: string) {
  const db = await getDb();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const attempts = await db.select().from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), gt(loginAttempts.createdAt, since)))
    .orderBy(desc(loginAttempts.createdAt)).limit(10).all();
  return attempts.filter((attempt) => !attempt.success).length >= 8;
}

export async function createInvitation(userId: string, createdBy: string, kind: "invite" | "reset" = "invite") {
  const db = await getDb();
  const token = randomToken();
  const timestamp = new Date().toISOString();
  await db.update(invitations).set({ revokedAt: timestamp })
    .where(and(eq(invitations.userId, userId), isNull(invitations.acceptedAt))).run();
  await db.insert(invitations).values({
    id: `inv_${crypto.randomUUID()}`,
    userId,
    tokenHash: await sha256(token),
    kind,
    expiresAt: new Date(Date.now() + 48 * 60 * 60_000).toISOString(),
    acceptedAt: null,
    revokedAt: null,
    createdBy,
    createdAt: timestamp,
  }).run();
  return token;
}

export async function invitationByToken(token: string) {
  if (token.length < 32) return null;
  const db = await getDb();
  const invitation = await db.select().from(invitations)
    .where(and(
      eq(invitations.tokenHash, await sha256(token)),
      gt(invitations.expiresAt, new Date().toISOString()),
    )).get();
  if (!invitation || invitation.acceptedAt || invitation.revokedAt) return null;
  const user = await db.select().from(users).where(eq(users.id, invitation.userId)).get();
  if (!user || user.status === "suspended") return null;
  return { invitation, user };
}

export async function acceptInvitation(token: string, password: string) {
  const resolved = await invitationByToken(token);
  if (!resolved) throw new Error("Este convite é inválido, expirou ou já foi utilizado.");
  await setUserPassword(resolved.user.id, password);
  const timestamp = new Date().toISOString();
  const db = await getDb();
  await db.update(invitations).set({ acceptedAt: timestamp })
    .where(eq(invitations.id, resolved.invitation.id)).run();
  await db.update(users).set({
    status: "active",
    lastLoginAt: timestamp,
    updatedAt: timestamp,
  }).where(eq(users.id, resolved.user.id)).run();
  return { user: resolved.user, sessionToken: await createSession(resolved.user.id) };
}
