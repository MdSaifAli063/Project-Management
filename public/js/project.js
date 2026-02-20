import { request } from "./api.js";
import { currentUser } from "./auth.js";
import { renderNavbar } from "./navbar.js";

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

let projectId;
let userRole;

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

async function loadProject() {
  const res = await request(`/projects/${projectId}`);
  const proj = res.data;
  document.getElementById("projectTitle").textContent = proj.name;
  document.getElementById("projectDescription").textContent =
    proj.description || "";
  if (userRole === "admin") {
    document.getElementById("projectControls").classList.remove("hidden");
    document.getElementById("editProjectName").value = proj.name;
    document.getElementById("editProjectDescription").value =
      proj.description || "";
  }
}

async function setupSections() {
  const r = await currentUser();
  userRole = r.user.role;
  const admin = userRole === "admin";
  const projAdmin = userRole === "project_admin";
  const member = userRole === "member";

  // show/hide sections based on table
  if (admin) {
    document.getElementById("addMemberSection").classList.remove("hidden");
    document.getElementById("createTaskSection").classList.remove("hidden");
    document.getElementById("createNoteSection").classList.remove("hidden");
    document.getElementById("projectControls").classList.remove("hidden");
  }
  if (projAdmin) {
    document.getElementById("createTaskSection").classList.remove("hidden");
  }
  // all roles can view tasks, notes, update subtask status handled in tasks.js

  // attach project edit/delete handlers if admin
  if (admin) {
    document.getElementById("editProjectBtn").addEventListener("click", () => {
      document.getElementById("editProjectSection").classList.toggle("hidden");
    });
    document
      .getElementById("editProjectForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await request(`/projects/${projectId}`, {
            method: "PUT",
            body: JSON.stringify({
              name: document.getElementById("editProjectName").value,
              description: document.getElementById("editProjectDescription")
                .value,
            }),
          });
          showMessage("success", "Project updated");
          await loadProject();
        } catch (err) {
          showMessage("error", err.message || "Update failed");
        }
      });
    document
      .getElementById("deleteProjectBtn")
      .addEventListener("click", async () => {
        if (!confirm("Really delete project?")) return;
        try {
          await request(`/projects/${projectId}`, { method: "DELETE" });
          window.location = "dashboard.html";
        } catch (err) {
          showMessage("error", err.message || "Delete failed");
        }
      });
  }
}

async function init() {
  await renderNavbar();
  projectId = qs("projectId");
  if (!projectId) {
    alert("projectId required");
    return;
  }
  await setupSections();
  await loadProject();
}

init();
