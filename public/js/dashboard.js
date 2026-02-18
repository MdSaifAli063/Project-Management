// Dashboard initialization - simplified and robust
const pName = document.getElementById("pName");
const pDesc = document.getElementById("pDesc");
const createProjectBtn = document.getElementById("createProjectBtn");
const createMsg = document.getElementById("createMsg");
const projectsDiv = document.getElementById("projects");
const createBtn = document.getElementById("createBtn");
const createForm = document.getElementById("createForm");
const cancelBtn = document.getElementById("cancelBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const noProjects = document.getElementById("noProjects");

// Initialize dashboard
async function initDashboard() {
  console.log("Dashboard: Initializing...");

  // Check localStorage for token
  const token = localStorage.getItem("pc_access");
  const userJson = localStorage.getItem("pc_user");

  console.log("Dashboard: Token?", !!token, "User?", !!userJson);

  if (!token) {
    console.log("Dashboard: No token, redirecting to login");
    window.location.href = "/login.html";
    return;
  }

  // Parse user from localStorage (don't need API for display)
  let user = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.warn("Dashboard: Failed to parse user:", e.message);
    user = null;
  }

  // Display user info
  if (user) {
    console.log("Dashboard: User from localStorage:", user.name);
    // expose globally for other modules
    window.CURRENT_USER = user;
    userInfo.textContent = `${user.name} (${user.role})`;
    // Only show create button for system admins
    if (user.role === "admin") {
      createBtn.style.display = "inline-block";
    }
  } else {
    console.log("Dashboard: No user in localStorage, using fallback");
    userInfo.textContent = "User";
  }

  // Load projects
  console.log("Dashboard: Loading projects...");
  loadProjects();
}

// Load projects from API
async function loadProjects() {
  try {
    const { ok, data } = await api.get("/api/v1/projects");
    console.log(
      "Dashboard: Projects response:",
      ok,
      data?.projects?.length || 0,
    );

    if (ok && data.projects && data.projects.length > 0) {
      projectsDiv.innerHTML = "";
      noProjects.style.display = "none";
      data.projects.forEach((p) => {
        const card = document.createElement("a");
        card.href = `/project.html?id=${p._id}`;
        card.className = "card";
        card.style.textDecoration = "none";
        card.style.color = "inherit";
        card.innerHTML = `
          <h3 style="margin: 0 0 8px 0;">${p.name}</h3>
          <p style="color: var(--gray); font-size: 14px; margin: 0 0 12px 0;">${p.description || "No description"}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge">👥 ${p.memberCount || 0} members</span>
          </div>
        `;
        projectsDiv.appendChild(card);
      });
    } else if (ok) {
      projectsDiv.innerHTML = "";
      noProjects.style.display = "block";
    } else {
      projectsDiv.innerHTML =
        "<p style='color: var(--danger);'>Failed to load projects. Please try again.</p>";
    }
  } catch (e) {
    console.error("Dashboard: Error loading projects:", e.message);
    projectsDiv.innerHTML =
      "<p style='color: var(--danger);'>Error loading projects. Please refresh the page.</p>";
  }
}

// Event handlers
logoutBtn.onclick = async () => {
  console.log("Dashboard: Logging out...");
  try {
    await api.post("/api/v1/auth/logout");
  } catch (e) {
    console.warn("Dashboard: Logout API error:", e.message);
  }
  api.setToken(null);
  api.setUser(null);
  window.location.href = "/";
};

createBtn.onclick = () => {
  createForm.style.display = "block";
  pName.focus();
};

cancelBtn.onclick = () => {
  createForm.style.display = "none";
  pName.value = "";
  pDesc.value = "";
  createMsg.textContent = "";
};

createProjectBtn.onclick = async () => {
  const name = pName.value.trim();
  const description = pDesc.value.trim();

  if (!name) {
    createMsg.textContent = "Project name is required";
    createMsg.style.color = "var(--danger)";
    return;
  }

  console.log("Dashboard: Creating project:", name);

  const { ok, data, error } = await api.post("/api/v1/projects", {
    name,
    description,
  });

  if (ok) {
    createMsg.textContent = "Project created successfully!";
    createMsg.style.color = "var(--success)";
    pName.value = "";
    pDesc.value = "";
    createForm.style.display = "none";
    setTimeout(() => {
      loadProjects();
      createMsg.textContent = "";
    }, 500);
  } else {
    createMsg.textContent = error?.message || "Error creating project";
    createMsg.style.color = "var(--danger)";
  }
};

// Start initialization
console.log("Dashboard: Script loaded, calling initDashboard");
initDashboard();
