import { request } from "./api.js";
import { currentUser } from "./auth.js";

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

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

async function loadMembers() {
  const projectId = qs("projectId");
  const res = await request(`/projects/${projectId}/members`);
  const list = document.getElementById("membersList");
  list.innerHTML = "";
  const userResp = await currentUser();
  const isAdmin = userResp.user && userResp.user.role === "admin";
  res.data.forEach((m) => {
    const li = document.createElement("li");
    li.className = "card";
    li.textContent = `${m.user.fullName || m.user.username || ""} (${m.role})`;
    if (isAdmin) {
      const select = document.createElement("select");
      ["admin", "project_admin", "member"].forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        if (r === m.role) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", async () => {
        try {
          await request(`/projects/${projectId}/members/${m.user._id}`, {
            method: "PUT",
            body: JSON.stringify({ newRole: select.value }),
          });
          showMessage("success", "Role updated");
          await loadMembers();
        } catch (err) {
          showMessage("error", err.message || "Role update failed");
        }
      });
      li.appendChild(select);
      const del = document.createElement("button");
      del.textContent = "remove";
      del.className = "small";
      del.addEventListener("click", async () => {
        if (!confirm("Remove this member?")) return;
        try {
          await request(`/projects/${projectId}/members/${m.user._id}`, {
            method: "DELETE",
          });
          showMessage("success", "Member removed");
          await loadMembers();
        } catch (err) {
          showMessage("error", err.message || "Remove failed");
        }
      });
      li.appendChild(del);
    }
    list.appendChild(li);
  });
}

async function init() {
  const projectId = qs("projectId");
  const addForm = document.getElementById("addMemberForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("memberEmail").value;
      const role = document.getElementById("memberRole").value;
      try {
        await request(`/projects/${projectId}/members`, {
          method: "POST",
          body: JSON.stringify({ email, role }),
        });
        showMessage("success", "Member added");
        document.getElementById("memberEmail").value = "";
        await loadMembers();
      } catch (err) {
        showMessage("error", err.message || "Add failed");
      }
    });
  }
  await loadMembers();
}

init();
