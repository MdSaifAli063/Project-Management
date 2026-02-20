import { request } from "./api.js";

async function login(email, password) {
  const res = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    localStorage.setItem("token", res.token);
  }
  return res;
}

async function register(username, email, password) {
  return await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

async function currentUser() {
  return await request("/auth/current-user");
}

async function logout() {
  localStorage.removeItem("token");
  try {
    await request("/auth/logout", { method: "POST" });
  } catch (e) {}
}

// helper for showing message on auth pages
function showMessage(type, text) {
  const msg = document.getElementById("message");
  if (!msg) return;
  msg.className = `msg ${type}`;
  msg.textContent = text;
  setTimeout(() => {
    msg.textContent = "";
    msg.className = "msg";
  }, 4000);
}

// if login form is present, attach handler
function attachFormHandlers() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      try {
        await login(email, password);
        window.location = "dashboard.html";
      } catch (err) {
        showMessage("error", err.message || "Login failed");
      }
    });
  }
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      try {
        await register(username, email, password);
        window.location = "login.html";
      } catch (err) {
        showMessage("error", err.message || "Registration failed");
      }
    });
  }
}

attachFormHandlers();

export { login, register, currentUser, logout };
