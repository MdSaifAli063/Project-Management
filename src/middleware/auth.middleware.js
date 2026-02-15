import { verifyToken } from "../utils/token.js";

export default function authMiddleware(req, res, next) {
  const auth = (req.headers.authorization || "").trim();
  if (!auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload)
    return res.status(401).json({ error: "Invalid or expired token" });
  req.user = { id: payload.id, username: payload.username };
  return next();
}
