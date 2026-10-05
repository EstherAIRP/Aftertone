import { getSession, noStore } from "../_auth.js";

export default function handler(request, response) {
  noStore(response);
  if (request.method !== "GET") return response.status(405).end();
  const session = getSession(request);
  const loginAvailable = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "ALLOWED_GITHUB_LOGIN", "ALLOWED_GITHUB_ID", "SESSION_SECRET", "APP_ORIGIN"].every((name) => Boolean(process.env[name]));
  return response
    .status(200)
    .json(
      session
        ? { authenticated: true, login: session.login, loginAvailable }
        : { authenticated: false, loginAvailable },
    );
}
