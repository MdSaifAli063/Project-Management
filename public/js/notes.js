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

async function loadNotes() {
  const projectId = qs("projectId");
  const userResp = await currentUser();
  const isAdmin = userResp.user && userResp.user.role === "admin";
  const res = await request(`/notes/${projectId}`);
  const list = document.getElementById("noteList");
  list.innerHTML = "";
  res.notes.forEach((n) => {
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `<strong>${n.title}</strong><p>${n.content}</p>`;
    if (isAdmin) {
      const edit = document.createElement("button");
      edit.textContent = "edit";
      edit.className = "small";
      edit.addEventListener("click", async () => {
        const newTitle = prompt("Title", n.title);
        if (newTitle == null) return;
        const newContent = prompt("Content", n.content || "");
        try {
          await request(`/notes/${projectId}/n/${n._id}`, {
            method: "PUT",
            body: JSON.stringify({ title: newTitle, content: newContent }),
          });
          showMessage("success", "Note updated");
          await loadNotes();
        } catch (err) {
          showMessage("error", err.message || "Update failed");
        }
      });
      li.appendChild(edit);
      const del = document.createElement("button");
      del.textContent = "delete";
      del.className = "small";
      del.addEventListener("click", async () => {
        if (!confirm("Delete note?")) return;
        try {
          await request(`/notes/${projectId}/n/${n._id}`, { method: "DELETE" });
          showMessage("success", "Note deleted");
          await loadNotes();
        } catch (err) {
          showMessage("error", err.message || "Delete failed");
        }
      });
      li.appendChild(del);
    }
    list.appendChild(li);
  });
}

async function init() {
  const projectId = qs("projectId");
  const createForm = document.getElementById("createNoteForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("noteTitle").value;
      const content = document.getElementById("noteContent").value;
      try {
        await request(`/notes/${projectId}`, {
          method: "POST",
          body: JSON.stringify({ title, content }),
        });
        showMessage("success", "Note created");
        document.getElementById("noteTitle").value = "";
        document.getElementById("noteContent").value = "";
        await loadNotes();
      } catch (err) {
        showMessage("error", err.message || "Creation failed");
      }
    });
  }
  await loadNotes();
}

init();
