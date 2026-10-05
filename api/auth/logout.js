import { clearSessionCookie, noStore } from "../_auth.js";

export default function handler(request, response) {
  noStore(response);
  if (request.method !== "POST") return response.status(405).end();
  clearSessionCookie(response);
  return response.status(204).end();
}
