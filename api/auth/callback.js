import {
  appOrigin,
  callbackUrl,
  clearStateCookie,
  env,
  getStateCookie,
  noStore,
  setSessionCookie,
} from "../_auth.js";

export default async function handler(request, response) {
  noStore(response);
  if (request.method !== "GET") return response.status(405).end();
  const origin = appOrigin();
  const state = getStateCookie(request);
  clearStateCookie(response);
  if (
    !state ||
    typeof request.query.state !== "string" ||
    state !== request.query.state ||
    typeof request.query.code !== "string"
  ) {
    return response.redirect(302, `${origin}/?auth_error=state`);
  }
  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env("GITHUB_CLIENT_ID"),
          client_secret: env("GITHUB_CLIENT_SECRET"),
          code: request.query.code,
          redirect_uri: callbackUrl(),
          state,
        }),
      },
    );
    if (!tokenResponse.ok) throw new Error("GitHub token exchange failed");
    const token = await tokenResponse.json();
    if (typeof token.access_token !== "string")
      throw new Error("Missing token");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Aftertone",
      },
    });
    if (!userResponse.ok) throw new Error("GitHub user lookup failed");
    const user = await userResponse.json();
    if (
      typeof user.login !== "string" ||
      typeof user.id !== "number" ||
      user.login.toLowerCase() !== env("ALLOWED_GITHUB_LOGIN").toLowerCase() ||
      String(user.id) !== env("ALLOWED_GITHUB_ID")
    ) {
      return response.redirect(302, `${origin}/?auth_error=account`);
    }
    setSessionCookie(response, { login: user.login, id: user.id });
    return response.redirect(302, origin);
  } catch {
    return response.redirect(302, `${origin}/?auth_error=github`);
  }
}
