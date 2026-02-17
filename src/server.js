const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const fs = require("fs");
const { connectDB } = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
require("dotenv").config();

const app = express();

// Ensure uploads directory exists (use project root `public` folder)
const uploadDir = path.join(process.cwd(), "public", "images", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Middlewares
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Allow multiple origins via comma-separated CLIENT_URL in .env (dev convenience)
const rawClient = process.env.CLIENT_URL || "http://localhost:5173";
const clientOrigins = rawClient
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: clientOrigins.length === 1 ? clientOrigins[0] : clientOrigins,
    credentials: true,
  }),
);

// Development-friendly Content Security Policy to allow frontend dev server and devtools
app.use((req, res, next) => {
  // pick first origin for CSP listing
  const client = clientOrigins[0] || "http://localhost:5173";
  let clientHost = "localhost:5173";
  try {
    clientHost = new URL(client).host;
  } catch (e) {
    // fallback
    clientHost = client.replace(/^https?:\/\//, "");
  }

  const cspParts = [
    `default-src 'self' ${client} 'unsafe-inline' 'unsafe-eval'`,
    `connect-src 'self' ${client} ws://${clientHost}`,
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
  ];
  res.setHeader("Content-Security-Policy", cspParts.join("; "));
  next();
});

// Static frontend & files (serve from project root `public`)
app.use(express.static(path.join(process.cwd(), "public")));
app.use(
  "/images",
  express.static(path.join(process.cwd(), "public", "images")),
);

// Routes
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/projects", require("./routes/project.routes"));
app.use("/api/v1/tasks", require("./routes/task.routes"));
app.use("/api/v1/notes", require("./routes/note.routes"));
app.use("/api/v1/healthcheck", require("./routes/health.routes"));

// Error handler
app.use(errorHandler);

// Start
const PORT = process.env.PORT || 5000;
// Connect to DB in background; server starts regardless
connectDB().catch((err) => console.error("Database init failed:", err.message));
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
