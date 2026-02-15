import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();

// basic configurations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// cors configurations
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// dynamically import and mount routers so a bad route file can't crash the process
(async () => {
  // helper to try importing and mounting a router
  const tryMount = async (mountPath, modulePath) => {
    try {
      const mod = await import(modulePath);
      if (mod && mod.default) {
        app.use(mountPath, mod.default);
        console.log(`Mounted router ${modulePath} at ${mountPath}`);
      } else {
        console.warn(
          `Router module ${modulePath} did not export a default router.`
        );
      }
    } catch (err) {
      console.error(
        `Failed to load router ${modulePath} for mount ${mountPath}:`
      );
      console.error(err && err.stack ? err.stack : err);
      console.error(
        `Skipping mount of ${modulePath}. Inspect the file for invalid route strings (e.g. full URLs or malformed params).`
      );
    }
  };

  // try to mount auth and project routers (adjust or add more as needed)
  await tryMount("/api/auth", "./routes/auth.routes.js");
  await tryMount("/api/projects", "./routes/project.routes.js");
})();

// serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "..", "public")));

// SPA fallback (use safe catch-all)
app.get("/:path(.*)", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(join(__dirname, "..", "public", "index.html"));
});

export default app;
