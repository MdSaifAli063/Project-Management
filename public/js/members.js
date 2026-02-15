const membersDiv = document.getElementById("members");
const memEmail = document.getElementById("memEmail");
const memRole = document.getElementById("memRole");
const addMemberBtn = document.getElementById("addMemberBtn");
const memMsg = document.getElementById("memMsg");

async function loadMembers() {
  const { ok, data } = await api.get(`/api/v1/projects/${projectId}/members`);
  if (!ok) {
    membersDiv.innerHTML = "Failed to load members.";
    return;
  }
  membersDiv.innerHTML = "";
  (data.members || []).forEach((m) => {
    const el = document.createElement("div");
    el.className = "flex mt-1";
    el.innerHTML = `
      <div><strong>${m.user.name}</strong> <span class="kv">${m.user.email}</span></div>
      <span class="badge">${m.role}</span>
      <span class="right">
        <button class="mkAdmin" data-id="${m.user._id}">Make Admin</button>
        <button class="mkProj" data-id="${m.user._id}">Make Project Admin</button>
        <button class="mkMem" data-id="${m.user._id}">Make Member</button>
        <button class="rm" data-id="${m.user._id}">Remove</button>
      </span>
    `;
    membersDiv.appendChild(el);
  });

  membersDiv
    .querySelectorAll(".mkAdmin")
    .forEach((btn) => roleUpdate(btn, "admin"));
  membersDiv
    .querySelectorAll(".mkProj")
    .forEach((btn) => roleUpdate(btn, "project_admin"));
  membersDiv
    .querySelectorAll(".mkMem")
    .forEach((btn) => roleUpdate(btn, "member"));
  membersDiv.querySelectorAll(".rm").forEach((btn) => {
    btn.onclick = async () => {
      const userId = btn.getAttribute("data-id");
      const { ok } = await api.del(
        `/api/v1/projects/${projectId}/members/${userId}`,
      );
      if (ok) loadMembers();
    };
  });
}

function roleUpdate(btn, role) {
  btn.onclick = async () => {
    const userId = btn.getAttribute("data-id");
    const { ok } = await api.put(
      `/api/v1/projects/${projectId}/members/${userId}`,
      { role },
    );
    if (ok) loadMembers();
  };
}

addMemberBtn.onclick = async () => {
  const { ok, error } = await api.post(
    `/api/v1/projects/${projectId}/members`,
    {
      email: memEmail.value.trim(),
      role: memRole.value,
    },
  );
  memMsg.textContent = ok ? "Member added" : error?.message || "Error";
  if (ok) {
    memEmail.value = "";
    loadMembers();
  }
};

// Wait for project to load, then load members and enforce system-admin-only controls for adding/updating members
document.addEventListener("project:loaded", async (e) => {
  const user = await api.whoami();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }
  if (user.role !== "admin") {
    if (memEmail) memEmail.style.display = "none";
    if (memRole) memRole.style.display = "none";
    if (addMemberBtn) addMemberBtn.style.display = "none";
  }
  loadMembers();
});
