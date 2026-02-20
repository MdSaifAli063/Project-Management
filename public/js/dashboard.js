import { request } from "./api.js";
import { currentUser } from "./auth.js";
import { renderNavbar } from "./navbar.js";

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

async function loadProjects() {
  try {
    const res = await request("/projects");
    const list = document.getElementById("projectList");
    list.innerHTML = "";
    res.data.forEach((p) => {
      const li = document.createElement("li");
      li.className = "card";
      li.innerHTML = `<a href="project.html?projectId=${p.project._id}">${p.project.name}</a> (role: ${p.role})`;
      list.appendChild(li);
    });
  } catch (err) {
    showMessage("error", err.message || "Failed to load projects");
  }
}

async function init() {
  await renderNavbar();
  const userResp = await currentUser();
  const isAdmin = userResp.user && userResp.user.role === "admin";
  if (isAdmin) {
    document.getElementById("createProjectSection").classList.remove("hidden");
    document
      .getElementById("createProjectForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("projectName").value;
        const description = document.getElementById("projectDescription").value;
        try {
          await request("/projects", {
            method: "POST",
            body: JSON.stringify({ name, description }),
          });
          showMessage("success", "Project created");
          document.getElementById("projectName").value = "";
          document.getElementById("projectDescription").value = "";
          await loadProjects();
        } catch (err) {
          showMessage("error", err.message || "Failed to create");
        }
      });
  }
  await loadProjects();
}

init().catch((err) => console.error(err));
