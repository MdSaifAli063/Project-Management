const api = {
  accessToken: localStorage.getItem("pc_access") || null,
  setToken(token) {
    this.accessToken = token;
    if (token) localStorage.setItem("pc_access", token);
    else localStorage.removeItem("pc_access");
  },
  getToken() {
    return this.accessToken || localStorage.getItem("pc_access") || "";
  },

  async request(path, { method = "GET", body, formData } = {}) {
    const headers = {};
    if (!formData) headers["Content-Type"] = "application/json";
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(path, {
      method,
      headers,
      credentials: "include",
      body: formData ? formData : body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // If we had a token, try refresh once
      if (token) {
        const refreshed = await this.refresh();
        if (refreshed) return this.request(path, { method, body, formData });
      }
      // Not authorized - clear token and redirect to login page
      this.setToken(null);
      if (window && window.location) window.location.href = "/login.html";
      return {
        ok: false,
        status: 401,
        data: null,
        error: { message: "Unauthorized" },
      };
    }
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: data && !res.ok ? data : null,
    };
  },

  async get(path) {
    return this.request(path);
  },
  async post(path, body) {
    return this.request(path, { method: "POST", body });
  },
  async put(path, body) {
    return this.request(path, { method: "PUT", body });
  },
  async del(path) {
    return this.request(path, { method: "DELETE" });
  },
  async upload(path, formData) {
    return this.request(path, { method: "POST", formData });
  },

  async refresh() {
    const res = await fetch("/api/v1/auth/refresh-token", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      this.setToken(null);
      return false;
    }
    const data = await res.json();
    if (data?.accessToken) this.setToken(data.accessToken);
    return true;
  },
};
