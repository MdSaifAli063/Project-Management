const notesDiv = document.getElementById('notes');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const createNoteBtn = document.getElementById('createNoteBtn');
const noteMsg = document.getElementById('noteMsg');

async function loadNotes() {
  const { ok, data } = await api.get(`/api/v1/notes/${projectId}`);
  if (!ok) { notesDiv.innerHTML = 'Failed to load notes.'; return; }
  notesDiv.innerHTML = '';
  data.notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'card mt-1';
    el.innerHTML = `
      <div class="flex"><strong>${n.title}</strong>
        <button data-id="${n._id}" class="delNote right">Delete</button></div>
      <div class="kv mt-1">${n.content || ''}</div>
    `;
    notesDiv.appendChild(el);
  });
  notesDiv.querySelectorAll('.delNote').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      const { ok } = await api.del(`/api/v1/notes/${projectId}/n/${id}`);
      if (ok) loadNotes();
    };
  });
}

createNoteBtn.onclick = async () => {
  const { ok, error } = await api.post(`/api/v1/notes/${projectId}`, {
    title: noteTitle.value.trim(),
    content: noteContent.value.trim()
  });
  noteMsg.textContent = ok ? 'Note created' : (error?.message || 'Error');
  if (ok) { noteTitle.value = ''; noteContent.value = ''; loadNotes(); }
};

loadNotes();