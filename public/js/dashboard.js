const pName = document.getElementById("pName");
const pDesc = document.getElementById("pDesc");
const createProjectBtn = document.getElementById("createProjectBtn");
const createMsg = document.getElementById("createMsg");
const projectsDiv = document.getElementById("projects");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.onclick = async () => {
  await api.post("/api/v1/auth/logout");
  api.setToken(null);
  api.setUser(null);
  window.location.href = "/";
};

async function loadProjects() {
  const { ok, data } = await api.get("/api/v1/projects");
  if (ok) {
    projectsDiv.innerHTML = "";
    data.projects.forEach((p) => {
      const a = document.createElement("a");
      a.href = `/project.html?id=${p._id}`;
      a.innerHTML = `<div class="card mt-1"><div class="flex"><strong>${p.name}</strong><span class="right badge">${p.memberCount} members</span></div><div class="kv mt-1">${p.description || ""}</div></div>`;
      projectsDiv.appendChild(a);
    });
  } else {
    projectsDiv.innerHTML = "<p>Failed to load projects. Please login.</p>";
  }
}

// show/hide create project for system admin only
(async function initRole() {
  const user = await api.whoami();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  if (user.role !== "admin") {
    document.querySelector(".card h2").textContent =
      "Create project (Admin only)";
    // hide create form if not admin
    createProjectBtn.style.display = "none";
    pName.style.display = "none";
    pDesc.style.display = "none";
  }
})();

createProjectBtn.onclick = async () => {
  const { ok, data, error } = await api.post("/api/v1/projects", {
    name: pName.value.trim(),
    description: pDesc.value.trim(),
  });
  createMsg.textContent = ok ? "Project created" : error?.message || "Error";
  if (ok) {
    pName.value = "";
    pDesc.value = "";
    loadProjects();
  }
};

loadProjects();
