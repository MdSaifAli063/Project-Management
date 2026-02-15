import crypto from "crypto";

const SECRET = process.env.TOKEN_SECRET || "dev-secret-change-me";
const ALGO = "sha256";

export function signToken(payload = {}, expiresInSec = 60 * 60 * 24) {
  const now = Math.floor(Date.now() / 1000);
  const data = { ...payload, iat: now, exp: now + expiresInSec };
  const json = JSON.stringify(data);
  const payloadB64 = Buffer.from(json).toString("base64url");
  const hmac = crypto.createHmac(ALGO, SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${hmac}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = crypto
    .createHmac(ALGO, SECRET)
    .update(payloadB64)
    .digest("hex");
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const data = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function timingSafeEqual(a, b) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
