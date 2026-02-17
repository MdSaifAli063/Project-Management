const notesListDiv = document.getElementById("notes-list");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const createNoteBtn = document.getElementById("createNoteBtn");
const noteForm = document.getElementById("noteForm");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const cancelNoteBtn = document.getElementById("cancelNoteBtn");
const noteMsg = document.getElementById("noteMsg");

let projectId;

document.addEventListener("project:loaded", async (e) => {
  projectId = e.detail.projectId;
  const role = e.detail.role;

  // Note creation allowed for project admins and above
  if (role === "admin" || role === "project_admin") {
    createNoteBtn.style.display = "inline-block";
  }

  loadNotes();
});

createNoteBtn.onclick = () => {
  noteForm.style.display = "block";
  noteTitle.focus();
};

cancelNoteBtn.onclick = () => {
  noteForm.style.display = "none";
  noteTitle.value = "";
  noteContent.value = "";
  noteMsg.textContent = "";
};

async function loadNotes() {
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
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0;">${n.title}</h3>
          <p style="color: var(--gray); margin: 0;">${n.content || "No content"}</p>
        </div>
        <button data-id="${n._id}" class="delNote btn btn-outline" style="color: var(--danger); white-space: nowrap; margin-left: 8px;">Delete</button>
      </div>
    `;
    notesListDiv.appendChild(el);
  });

  notesListDiv.querySelectorAll(".delNote").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-id");
      const { ok } = await api.del(`/api/v1/notes/${projectId}/n/${id}`);
      if (ok) loadNotes();
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

  const { ok, error } = await api.post(`/api/v1/notes/${projectId}`, {
    title,
    content,
  });
  if (ok) {
    noteMsg.textContent = "Note created successfully!";
    noteMsg.style.color = "var(--success)";
    noteTitle.value = "";
    noteContent.value = "";
    noteForm.style.display = "none";
    setTimeout(() => {
      noteMsg.textContent = "";
      loadNotes();
    }, 500);
  } else {
    noteMsg.textContent = error?.message || "Error creating note";
    noteMsg.style.color = "var(--danger)";
  }
};
