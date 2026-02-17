const membersListDiv = document.getElementById("members-list");
const memberEmail = document.getElementById("memEmail");
const memberRole = document.getElementById("memRole");
const addMemberBtn = document.getElementById("addMemberBtn");
const memberForm = document.getElementById("memberForm");
const saveMemberBtn = document.getElementById("saveMemberBtn");
const cancelMemberBtn = document.getElementById("cancelMemberBtn");
const memMsg = document.getElementById("memMsg");

let projectId;

document.addEventListener("project:loaded", async (e) => {
  projectId = e.detail.projectId;
  const role = e.detail.role;

  // Member management allowed for project admins and above
  if (role === "admin" || role === "project_admin") {
    addMemberBtn.style.display = "inline-block";
  }

  loadMembers();
});

addMemberBtn.onclick = () => {
  memberForm.style.display = "block";
  memberEmail.focus();
};

cancelMemberBtn.onclick = () => {
  memberForm.style.display = "none";
  memberEmail.value = "";
  memberRole.value = "member";
  memMsg.textContent = "";
};

async function loadMembers() {
  const { ok, data } = await api.get(`/api/v1/projects/${projectId}/members`);
  if (!ok) {
    membersListDiv.innerHTML =
      "<p style='color: var(--danger);'>Failed to load members.</p>";
    return;
  }
  membersListDiv.innerHTML = "";

  if (!data.members || data.members.length === 0) {
    membersListDiv.innerHTML =
      "<p style='color: var(--gray);'>No members yet.</p>";
    return;
  }

  (data.members || []).forEach((m) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 4px 0;">${m.user.name}</h3>
        <p style="color: var(--gray); font-size: 12px; margin: 0 0 8px 0;">${m.user.email}</p>
        <span class="badge" style="background: var(--primary); color: white;">${m.role}</span>
      </div>
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        <button class="mkAdmin btn btn-outline" data-id="${m.user._id}" style="font-size: 11px; padding: 4px 8px;">Make Admin</button>
        <button class="mkProj btn btn-outline" data-id="${m.user._id}" style="font-size: 11px; padding: 4px 8px;">Make Project Admin</button>
        <button class="mkMem btn btn-outline" data-id="${m.user._id}" style="font-size: 11px; padding: 4px 8px;">Make Member</button>
        <button class="rm btn btn-outline" data-id="${m.user._id}" style="font-size: 11px; padding: 4px 8px; color: var(--danger);">Remove</button>
      </div>
    `;
    membersListDiv.appendChild(el);
  });

  membersListDiv
    .querySelectorAll(".mkAdmin")
    .forEach((btn) => roleUpdate(btn, "admin"));
  membersListDiv
    .querySelectorAll(".mkProj")
    .forEach((btn) => roleUpdate(btn, "project_admin"));
  membersListDiv
    .querySelectorAll(".mkMem")
    .forEach((btn) => roleUpdate(btn, "member"));
  membersListDiv.querySelectorAll(".rm").forEach((btn) => {
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

saveMemberBtn.onclick = async () => {
  const email = memberEmail.value.trim();
  const role = memberRole.value;

  if (!email) {
    memMsg.textContent = "Email is required";
    memMsg.style.color = "var(--danger)";
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    memMsg.textContent = "Please enter a valid email";
    memMsg.style.color = "var(--danger)";
    return;
  }

  const { ok, error } = await api.post(
    `/api/v1/projects/${projectId}/members`,
    {
      email,
      role,
    },
  );
  if (ok) {
    memMsg.textContent = "Member added successfully!";
    memMsg.style.color = "var(--success)";
    memberEmail.value = "";
    memberRole.value = "member";
    memberForm.style.display = "none";
    setTimeout(() => {
      memMsg.textContent = "";
      loadMembers();
    }, 500);
  } else {
    memMsg.textContent = error?.message || "Error adding member";
    memMsg.style.color = "var(--danger)";
  }
};
