import dotenv from "dotenv";
import express from "express";

dotenv.config({
  path: "./.env",
});

// stronger normalizer for route/use path arguments
const normalizeStringPath = (p) => {
  // preserve exact wildcard & root so Express SPA fallback works
  if (p === "*") return "*";
  if (p === "/") return "/";

  if (Array.isArray(p)) return p.map(normalizeStringPath);
  if (typeof p !== "string") return p;

  // If it's an absolute URL like "https://host/path", use the pathname
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) {
      const url = new URL(p);
      return url.pathname || "/";
    }
  } catch (e) {
    // fall through and try other strategies
  }

  // strip scheme-like prefix (e.g. "https:", "git+ssh:") to avoid leftover ':' chars
  const withoutScheme = p.replace(/^[a-z][a-z0-9+.-]*:/i, "");

  // collapse repeated leading slashes to a single leading slash
  const collapsed = withoutScheme.replace(/^\/+/, "/");

  // ensure leading slash (but '*' already handled above)
  return collapsed.startsWith("/") ? collapsed : `/${collapsed}`;
};

// create a Route-like no-op object so callers can chain .get/.post etc without crashing.
// This will log a warning for visibility.
const createNoopRoute = (origPath) => {
  const noop = () => noop;
  const methods = [
    "get",
    "post",
    "put",
    "delete",
    "patch",
    "all",
    "head",
    "options",
  ];
  methods.forEach((m) => {
    noop[m] = function () {
      console.warn(
        `[WARN] skipped registering ${m.toUpperCase()} handler for invalid route path: ${origPath}`
      );
      return noop;
    };
  });
  return noop;
};

// patch Router.prototype.route with normalization + safe fallback
const origRoute = express.Router.prototype.route;
express.Router.prototype.route = function (path) {
  const safePath = normalizeStringPath(path);

  // special handling: if wildcard, try to register it; if it fails, register a safe catch-all
  if (safePath === "*") {
    try {
      return origRoute.call(this, "*");
    } catch (err) {
      // try a safe express-compatible catch-all pattern
      try {
        return origRoute.call(this, "/:path(.*)");
      } catch (retryErr) {
        console.error(
          `[ERROR] route registration failed for path: ${String(path)}`
        );
        console.error(retryErr.stack || retryErr);
        return createNoopRoute(String(path));
      }
    }
  }

  try {
    return origRoute.call(this, safePath);
  } catch (err) {
    // If path-to-regexp complains, attempt a best-effort extraction once more.
    if (
      err &&
      typeof err.message === "string" &&
      err.message.includes("Missing parameter name")
    ) {
      try {
        const alt = normalizeStringPath(path);
        return origRoute.call(this, alt);
      } catch (retryErr) {
        console.error(
          `[ERROR] route registration failed for path: ${String(path)}`
        );
        console.error(retryErr.stack || retryErr);
        return createNoopRoute(String(path));
      }
    }
    console.error(
      `[ERROR] route registration failed for path: ${String(path)}`
    );
    console.error(err.stack || err);
    return createNoopRoute(String(path));
  }
};

// patch Router.prototype.use similarly
const origRouterUse = express.Router.prototype.use;
express.Router.prototype.use = function (first, ...rest) {
  if (typeof first === "function") {
    return origRouterUse.call(this, first, ...rest);
  }
  const safe = normalizeStringPath(first);
  try {
    return origRouterUse.call(this, safe, ...rest);
  } catch (err) {
    console.error(`[ERROR] router.use failed for path: ${String(first)}`);
    console.error(err.stack || err);
    // swallow and continue to avoid crash
    return this;
  }
};

// patch application.use similarly
const origAppUse = express.application.use;
express.application.use = function (first, ...rest) {
  if (typeof first === "function") {
    return origAppUse.call(this, first, ...rest);
  }
  const safe = normalizeStringPath(first);
  try {
    return origAppUse.call(this, safe, ...rest);
  } catch (err) {
    console.error(`[ERROR] app.use failed for path: ${String(first)}`);
    console.error(err.stack || err);
    // swallow and continue to avoid crash
    return this;
  }
};

(async () => {
  try {
    // dynamic imports so import-time errors (e.g. bad route strings) are catchable here
    const { default: app } = await import("./app.js");
    const { default: connectDB } = await import("./db/index.js");

    const port = process.env.PORT || 3000;

    await connectDB();

    app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  } catch (err) {
    // Helpful guidance for the common path-to-regexp error seen in your logs
    if (err && err.message && err.message.includes("Missing parameter name")) {
      console.error(
        "Startup failed: invalid route path detected while loading routes."
      );
      console.error("Common causes:");
      console.error(
        "- A route was registered with a full URL string (e.g. 'https://host/path') instead of a path like '/path'."
      );
      console.error(
        "- A route path contains a malformed parameter (e.g. '/:')."
      );
      console.error(
        "Please inspect your route files under src/routes and ensure paths are like '/projects' or '/projects/:id'."
      );
      console.error("\nOriginal error:");
      console.error(err.stack || err);
      process.exit(1);
    }

    console.error("Startup error:", err.stack || err);
    process.exit(1);
  }
})();
