const notesListDiv = document.getElementById("notes-list");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const createNoteBtn = document.getElementById("createNoteBtn");
const noteForm = document.getElementById("noteForm");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const cancelNoteBtn = document.getElementById("cancelNoteBtn");
const noteMsg = document.getElementById("noteMsg");

let projectId;
let editingNoteId = null; // null for create, note id for edit

document.addEventListener("project:loaded", async (e) => {
  projectId = e.detail.projectId;
  const role = e.detail.role;
  const user = window.CURRENT_USER || (await api.whoami());

  // Note creation allowed only for system admins
  if (user && user.role === "admin") {
    createNoteBtn.style.display = "inline-block";
  }

  loadNotes();
});

createNoteBtn.onclick = () => {
  editingNoteId = null;
  saveNoteBtn.textContent = "Create Note";
  noteForm.style.display = "block";
  noteTitle.focus();
};

cancelNoteBtn.onclick = () => {
  noteForm.style.display = "none";
  editingNoteId = null;
  saveNoteBtn.textContent = "Create Note";
  noteTitle.value = "";
  noteContent.value = "";
  noteMsg.textContent = "";
};

async function loadNotes() {
  const user = window.CURRENT_USER || (await api.whoami());
  const { ok, data } = await api.get(`/api/v1/notes/${projectId}`);
  if (!ok) {
    notesListDiv.innerHTML =
      "<p style='color: var(--danger);'>Failed to load notes.</p>";
    return;
  }
  notesListDiv.innerHTML = "";

  if (!data.notes || data.notes.length === 0) {
    notesListDiv.innerHTML = "<p style='color: var(--gray);'>No notes yet.</p>";
    return;
  }

  data.notes.forEach((n) => {
    const el = document.createElement("div");
    el.className = "card";
    let controls = "";
    if (user.role === "admin") {
      controls = `
        <button data-id="${n._id}" class="delNote btn btn-outline" style="color: var(--danger); white-space: nowrap; margin-left: 8px;">Delete</button>
        <button data-id="${n._id}" class="editNote btn btn-outline" style="margin-left:4px; font-size:12px;">Edit</button>
      `;
    }
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0;">${n.title}</h3>
          <p style="color: var(--gray); margin: 0;">${n.content || "No content"}</p>
        </div>
        ${controls}
      </div>
    `;
    notesListDiv.appendChild(el);
  });

  // bind note actions
  notesListDiv.querySelectorAll(".delNote").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const { ok } = await api.del(`/api/v1/notes/${projectId}/n/${id}`);
      if (ok) loadNotes();
    };
  });

  notesListDiv.querySelectorAll(".editNote").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const { ok, data } = await api.get(`/api/v1/notes/${projectId}/n/${id}`);
      if (!ok) return;
      const note = data.note;
      editingNoteId = id;
      saveNoteBtn.textContent = "Update Note";
      noteTitle.value = note.title;
      noteContent.value = note.content || "";
      noteForm.style.display = "block";
      noteTitle.focus();
    };
  });
}

saveNoteBtn.onclick = async () => {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title) {
    noteMsg.textContent = "Note title is required";
    noteMsg.style.color = "var(--danger)";
    return;
  }

  let res;
  if (editingNoteId) {
    res = await api.put(`/api/v1/notes/${projectId}/n/${editingNoteId}`, {
      title,
      content,
    });
  } else {
    res = await api.post(`/api/v1/notes/${projectId}`, {
      title,
      content,
    });
  }

  const { ok, error } = res;
  if (ok) {
    noteMsg.textContent = editingNoteId
      ? "Note updated successfully!"
      : "Note created successfully!";
    noteMsg.style.color = "var(--success)";
    noteTitle.value = "";
    noteContent.value = "";
    noteForm.style.display = "none";
    editingNoteId = null;
    saveNoteBtn.textContent = "Create Note";
    setTimeout(() => {
      noteMsg.textContent = "";
      loadNotes();
    }, 500);
  } else {
    noteMsg.textContent =
      error?.message ||
      (editingNoteId ? "Error updating note" : "Error creating note");
    noteMsg.style.color = "var(--danger)";
  }
};
