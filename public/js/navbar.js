import { currentUser, logout } from "./auth.js";

async function renderNavbar() {
  const nav = document.getElementById("navbar");
  let user;
  try {
    user = await currentUser();
  } catch (e) {
    // not logged in
  }

  nav.innerHTML = "";
  const path = window.location.pathname.split("/").pop();
  const makeLink = (href, label) => {
    const cls = href === path ? "active" : "";
    return `<a href="${href}" class="${cls}">${label}</a>`;
  };
  if (user && user.success) {
    nav.innerHTML = `
      ${makeLink("dashboard.html", "Dashboard")}
      <span>Welcome, ${user.user.username}</span>
      <a href="#" id="logoutLink">Logout</a>
    `;
    document
      .getElementById("logoutLink")
      .addEventListener("click", async () => {
        await logout();
        window.location = "login.html";
      });
  } else {
    nav.innerHTML = `
      ${makeLink("index.html", "Home")}
      ${makeLink("login.html", "Login")}
      ${makeLink("register.html", "Register")}
    `;
  }
}

export { renderNavbar };
