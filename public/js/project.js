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
}

loadProject();
