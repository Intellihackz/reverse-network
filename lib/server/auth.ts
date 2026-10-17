import { importSPKI, jwtVerify } from "jose";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

const keyCache = new Map<string, ReturnType<typeof importSPKI>>();

function verificationKey(pem: string) {
  let key = keyCache.get(pem);
  if (!key) {
    key = importSPKI(pem, "ES256");
    keyCache.set(pem, key);
  }
  return key;
}

function fail(status: number, message: string): AuthResult {
  return { ok: false, response: Response.json({ error: message }, { status }) };
}

/**
 * Verifies the Privy access token the browser sends. In production a missing
 * verification key refuses every request rather than letting anyone through.
 */
export async function authenticate(request: Request): Promise<AuthResult> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const pem = process.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, "\n");

  if (!appId || !pem) {
    if (process.env.NODE_ENV === "production") {
      return fail(503, "Sign-in verification is not configured.");
    }
    return { ok: true, userId: "dev" };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail(401, "Sign in to continue.");

  try {
    const { payload } = await jwtVerify(token, await verificationKey(pem), {
      issuer: "privy.io",
      audience: appId,
    });
    return { ok: true, userId: payload.sub ?? "unknown" };
  } catch {
    return fail(401, "Your session has expired. Sign in again.");
  }
}
