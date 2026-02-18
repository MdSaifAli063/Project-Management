const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("id");

const projectName = document.getElementById("projectName");
const projectDesc = document.getElementById("projectDesc");
const projRole = document.getElementById("projRole");
const memberCount = document.getElementById("memberCount");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

logoutBtn.onclick = async () => {
  await api.post("/api/v1/auth/logout");
  api.setToken(null);
  api.setUser(null);
  window.location.href = "/";
};

async function loadProject() {
  const user = await api.whoami();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  // expose user globally for other modules
  window.CURRENT_USER = user;
  userInfo.textContent = `${user.name} (${user.role})`;

  const { ok, data } = await api.get(`/api/v1/projects/${projectId}`);
  if (!ok) {
    window.location.href = "/dashboard.html";
    return;
  }
  const p = data.project;
  projectName.textContent = p.name;
  projectDesc.textContent = p.description || "";
  memberCount.textContent = `👥 ${p.memberCount || 0} members`;

  // determine project-scoped role for current user
  let role = null;
  try {
    const mem = (p.members || []).find((m) => {
      const uid = (m.user && (m.user._id || m.user.id)) || m.user;
      return String(uid) === String(user.id || user._id || user.userId);
    });
    role = mem ? mem.role : null;
  } catch (e) {
    role = null;
  }

  // global admins should automatically be treated as having admin privileges
  if (user.role === "admin") {
    role = "admin";
  }

  // Display role badges
  projRole.textContent = `Your Role: ${role || "Viewer"}`;
  projRole.style.background =
    role === "project_admin"
      ? "var(--primary)"
      : role === "member"
        ? "var(--secondary)"
        : "var(--gray)";
  projRole.style.color = "white";

  // publish project loaded event for other modules
  window.CURRENT_PROJECT = p;
  window.CURRENT_PROJECT_ROLE = role;
  const ev = new CustomEvent("project:loaded", {
    detail: { project: p, role, projectId },
  });
  document.dispatchEvent(ev);

  // show edit/delete controls to global admins
  if (user.role === "admin") {
    const editBtn = document.getElementById("editProjBtn");
    const delBtn = document.getElementById("deleteProjBtn");
    if (editBtn) {
      editBtn.style.display = "inline-block";
      editBtn.onclick = async () => {
        const newName = prompt("New project name", projectName.textContent);
        if (!newName) return;
        const newDesc = prompt(
          "New description (leave blank to keep)",
          projectDesc.textContent,
        );
        const { ok } = await api.put(`/api/v1/projects/${projectId}`, {
          name: newName,
          description: newDesc || "",
        });
        if (ok) {
          loadProject();
        } else {
          alert("Failed to update project");
        }
      };
    }
    if (delBtn) {
      delBtn.style.display = "inline-block";
      delBtn.onclick = async () => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        const { ok } = await api.del(`/api/v1/projects/${projectId}`);
        if (ok) window.location.href = "/dashboard.html";
        else alert("Failed to delete project");
      };
    }
  }
}

loadProject();
