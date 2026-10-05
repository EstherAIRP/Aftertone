import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "aftertone_session";
const STATE_COOKIE = "aftertone_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30;

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function appOrigin() {
  const origin = new URL(env("APP_ORIGIN"));
  if (!["http:", "https:"].includes(origin.protocol))
    throw new Error("Invalid APP_ORIGIN");
  return origin.origin;
}

export function callbackUrl() {
  return `${appOrigin()}/api/auth/callback`;
}

function cookieOptions(maxAge) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${appOrigin().startsWith("https:") ? "; Secure" : ""}`;
}

export function setStateCookie(response, state) {
  response.setHeader(
    "Set-Cookie",
    `${STATE_COOKIE}=${state}; ${cookieOptions(600)}`,
  );
}

export function clearStateCookie(response) {
  response.setHeader("Set-Cookie", `${STATE_COOKIE}=; ${cookieOptions(0)}`);
}

export function setSessionCookie(response, user) {
  const payload = Buffer.from(
    JSON.stringify({
      login: user.login,
      id: user.id,
      exp: Date.now() + MAX_AGE * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", env("SESSION_SECRET"))
    .update(payload)
    .digest("base64url");
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${payload}.${signature}; ${cookieOptions(MAX_AGE)}`,
  );
}

export function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieOptions(0)}`);
}

export function getCookie(request, name) {
  return (request.headers.cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function getStateCookie(request) {
  return getCookie(request, STATE_COOKIE);
}

export function getSession(request) {
  try {
    const cookie = getCookie(request, SESSION_COOKIE);
    if (!cookie) return null;
    const [payload, signature] = cookie.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", env("SESSION_SECRET"))
      .update(payload)
      .digest("base64url");
    const receivedBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (
      receivedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(receivedBytes, expectedBytes)
    )
      return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      !session.exp ||
      session.exp < Date.now() ||
      typeof session.login !== "string" ||
      typeof session.id !== "number"
    )
      return null;
    if (
      session.login.toLowerCase() !== env("ALLOWED_GITHUB_LOGIN").toLowerCase()
    )
      return null;
    if (String(session.id) !== env("ALLOWED_GITHUB_ID")) return null;
    return session;
  } catch {
    return null;
  }
}

export function randomState() {
  return randomBytes(32).toString("base64url");
}

export function noStore(response) {
  response.setHeader("Cache-Control", "private, no-store");
}
