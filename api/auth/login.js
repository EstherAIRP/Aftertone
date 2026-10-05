import {
  callbackUrl,
  env,
  noStore,
  randomState,
  setStateCookie,
} from "../_auth.js";

export default function handler(request, response) {
  noStore(response);
  if (request.method !== "GET") return response.status(405).end();
  try {
    const state = randomState();
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", env("GITHUB_CLIENT_ID"));
    url.searchParams.set("redirect_uri", callbackUrl());
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "read:user");
    setStateCookie(response, state);
    return response.redirect(302, url.toString());
  } catch {
    return response.status(503).send("GitHub login is not configured.");
  }
}
