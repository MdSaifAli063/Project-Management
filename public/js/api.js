// wrapper around fetch that attaches JSON headers and Authorization if token present
const API_BASE = "/api/v1";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const resp = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw data;
  }
  return data;
}

export { request };
