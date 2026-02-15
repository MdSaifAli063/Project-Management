const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("id");

const projectName = document.getElementById("projectName");
const projectDesc = document.getElementById("projectDesc");

async function loadProject() {
  const user = await api.whoami();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const { ok, data } = await api.get(`/api/v1/projects/${projectId}`);
  if (!ok) {
    window.location.href = "/dashboard.html";
    return;
  }
  const p = data.project;
  projectName.textContent = p.name;
  projectDesc.textContent = p.description || "";

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

  // publish project loaded event for other modules
  window.CURRENT_PROJECT = p;
  window.CURRENT_PROJECT_ROLE = role;
  const ev = new CustomEvent("project:loaded", {
    detail: { project: p, role, projectId },
  });
  document.dispatchEvent(ev);
}

loadProject();
