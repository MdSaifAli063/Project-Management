const tasksDiv = document.getElementById('tasks');
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDesc');
const taskAssignee = document.getElementById('taskAssignee');
const taskFiles = document.getElementById('taskFiles');
const createTaskBtn = document.getElementById('createTaskBtn');
const taskMsg = document.getElementById('taskMsg');

async function loadTasks() {
  const { ok, data } = await api.get(`/api/v1/tasks/${projectId}`);
  if (!ok) { tasksDiv.innerHTML = 'Failed to load tasks.'; return; }
  tasksDiv.innerHTML = '';
  data.tasks.forEach(t => {
    const el = document.createElement('div');
    el.className = 'card mt-1';
    el.innerHTML = `
      <div class="flex"><strong>${t.title}</strong>
        <span class="right status-${t.status}">${t.status}</span></div>
      <div class="kv mt-1">${t.description || ''}</div>
      <div class="kv mt-1">Assignee: ${t.assignee ? (t.assignee.name || t.assignee._id) : '—'}</div>
      <div class="mt-1">${(t.attachments||[]).map(a => `<a href="${a.url}" target="_blank">${a.originalName}</a>`).join(' ')}</div>
      <div class="mt-1">
        <strong>Subtasks:</strong>
        <ul>${(t.subtasks||[]).map(st => `<li>${st.title} ${st.isCompleted ? '✅' : ''} 
        <button data-sub="${st._id}" class="toggleSub">${st.isCompleted ? 'Unmark' : 'Mark done'}</button>
        <button data-del="${st._id}" class="delSub">Delete</button>
        </li>`).join('')}</ul>
        <div class="flex mt-1">
          <input placeholder="New subtask title" class="subTitle" />
          <button data-task="${t._id}" class="addSub">Add</button>
        </div>
      </div>
      <div class="flex mt-1">
        <select class="statusSel">
          <option value="todo" ${t.status==='todo'?'selected':''}>Todo</option>
          <option value="in_progress" ${t.status==='in_progress'?'selected':''}>In Progress</option>
          <option value="done" ${t.status==='done'?'selected':''}>Done</option>
        </select>
        <button data-task="${t._id}" class="saveTask">Save</button>
        <button data-task="${t._id}" class="delTask right">Delete</button>
      </div>
    `;
    tasksDiv.appendChild(el);
  });

  // Bind events
  tasksDiv.querySelectorAll('.addSub').forEach(btn => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute('data-task');
      const titleInput = btn.parentElement.querySelector('.subTitle');
      const title = titleInput.value.trim();
      if (!title) return;
      const { ok } = await api.post(`/api/v1/tasks/${projectId}/t/${taskId}/subtasks`, { title });
      if (ok) loadTasks();
    };
  });
  tasksDiv.querySelectorAll('.toggleSub').forEach(btn => {
    btn.onclick = async () => {
      const subId = btn.getAttribute('data-sub');
      const markDone = btn.textContent.includes('done');
      const { ok } = await api.put(`/api/v1/tasks/st/${subId}`, { isCompleted: markDone });
      if (ok) loadTasks();
    };
  });
  tasksDiv.querySelectorAll('.delSub').forEach(btn => {
    btn.onclick = async () => {
      const subId = btn.getAttribute('data-del');
      const { ok } = await api.del(`/api/v1/tasks/st/${subId}`);
      if (ok) loadTasks();
    };
  });
  tasksDiv.querySelectorAll('.saveTask').forEach(btn => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute('data-task');
      const status = btn.parentElement.querySelector('.statusSel').value;
      const { ok } = await api.put(`/api/v1/tasks/${projectId}/t/${taskId}`, { status });
      if (ok) loadTasks();
    };
  });
  tasksDiv.querySelectorAll('.delTask').forEach(btn => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute('data-task');
      const { ok } = await api.del(`/api/v1/tasks/${projectId}/t/${taskId}`);
      if (ok) loadTasks();
    };
  });
}

createTaskBtn.onclick = async () => {
  const fd = new FormData();
  fd.append('title', taskTitle.value.trim());
  fd.append('description', taskDesc.value.trim());
  if (taskAssignee.value.trim()) fd.append('assignee', taskAssignee.value.trim());
  for (const f of taskFiles.files) fd.append('attachments', f);

  const { ok, error } = await api.upload(`/api/v1/tasks/${projectId}`, fd);
  taskMsg.textContent = ok ? 'Task created' : (error?.message || 'Error');
  if (ok) {
    taskTitle.value = ''; taskDesc.value = ''; taskAssignee.value = ''; taskFiles.value = '';
    loadTasks();
  }
};

loadTasks();