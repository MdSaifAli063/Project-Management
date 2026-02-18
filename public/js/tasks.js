const tasksListDiv = document.getElementById("tasks-list");
const taskTitle = document.getElementById("taskTitle");
const taskDesc = document.getElementById("taskDesc");
const taskAssignee = document.getElementById("taskAssignee");
const taskFiles = document.getElementById("taskFiles");
const createTaskBtn = document.getElementById("createTaskBtn");
const taskForm = document.getElementById("taskForm");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const cancelTaskBtn = document.getElementById("cancelTaskBtn");
const taskMsg = document.getElementById("taskMsg");

let projectId;
let editingTaskId = null; // null = create mode, otherwise update existing task

document.addEventListener("project:loaded", async (e) => {
  projectId = e.detail.projectId;
  const role = e.detail.role;

  // Show create task button only for admin/project_admin
  if (role === "admin" || role === "project_admin") {
    createTaskBtn.style.display = "inline-block";
  }

  // Load tasks and then apply UI restrictions based on role
  await loadTasks();

  if (!["admin", "project_admin"].includes(role)) {
    // hide create controls for non-admins
    const createBtnEl = document.getElementById("createTaskBtn");
    if (createBtnEl) createBtnEl.style.display = "none";

    // hide inputs inside the form if present
    ["taskTitle", "taskDesc", "taskAssignee", "taskFiles"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // hide per-task admin controls in the rendered list
    tasksListDiv
      .querySelectorAll(
        ".addSub, .subTitle, .delSub, .saveTask, .delTask, .statusSel",
      )
      .forEach((b) => {
        b.style.display = "none";
      });
  }
});

createTaskBtn.onclick = () => {
  // open form in create mode
  editingTaskId = null;
  saveTaskBtn.textContent = "Create Task";
  taskForm.style.display = "block";
  taskTitle.focus();
};

cancelTaskBtn.onclick = () => {
  taskForm.style.display = "none";
  editingTaskId = null;
  saveTaskBtn.textContent = "Create Task";
  taskTitle.value = "";
  taskDesc.value = "";
  taskAssignee.value = "";
  taskFiles.value = "";
  taskMsg.textContent = "";
};

async function loadTasks() {
  const { ok, data } = await api.get(`/api/v1/tasks/${projectId}`);
  if (!ok) {
    tasksListDiv.innerHTML =
      "<p style='color: var(--danger);'>Failed to load tasks.</p>";
    return;
  }
  tasksListDiv.innerHTML = "";

  if (!data.tasks || data.tasks.length === 0) {
    tasksListDiv.innerHTML =
      "<p style='color: var(--gray);'>No tasks yet. Create one to get started.</p>";
    return;
  }

  data.tasks.forEach((t) => {
    const statusColor =
      t.status === "done"
        ? "var(--success)"
        : t.status === "in_progress"
          ? "var(--primary)"
          : "var(--gray)";

    const role = window.CURRENT_PROJECT_ROLE;
    const canModify = ["admin", "project_admin"].includes(role);

    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 4px 0;">${t.title}</h3>
          <span class="badge" style="background: ${statusColor}; color: white;">${t.status}</span>
        </div>
        ${canModify ? `<button data-task="${t._id}" class="editTask btn btn-outline" style="font-size:12px;">Edit</button>` : ""}
      </div>
      
      <p style="color: var(--gray); margin: 8px 0;">${t.description || "No description"}</p>
      
      <p style="font-size: 12px; color: var(--gray); margin: 8px 0;">
        👤 Assignee: ${t.assignee ? t.assignee.name || t.assignee._id : "Unassigned"}
      </p>
      
      ${
        (t.attachments || []).length > 0
          ? `
        <div style="margin: 8px 0;">
          <strong style="font-size: 12px;">Attachments:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${(t.attachments || []).map((a) => `<a href="${a.url}" target="_blank" class="badge" style="background: var(--primary); color: white; text-decoration: none;">${a.originalName}</a>`).join("")}
          </div>
        </div>
      `
          : ""
      }
      
      <div style="margin: 12px 0;">
        <strong style="font-size: 12px; color: var(--gray);">Subtasks:</strong>
        <div style="margin-top: 8px;">
          ${
            (t.subtasks || []).length > 0
              ? (t.subtasks || [])
                  .map(
                    (st) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--surface); border-radius: 4px; margin-bottom: 4px;">
              <span>${st.title} ${st.isCompleted ? "✅" : ""}</span>
              <div style="display: flex; gap: 4px;">
                <button data-sub="${st._id}" class="toggleSub btn btn-outline" style="padding: 4px 8px; font-size: 12px;">${st.isCompleted ? "Unmark" : "Mark done"}</button>
                <button data-del="${st._id}" class="delSub btn btn-outline" style="padding: 4px 8px; font-size: 12px; color: var(--danger);">Delete</button>
              </div>
            </div>
          `,
                  )
                  .join("")
              : "<p style='color: var(--gray); font-size: 12px;'>No subtasks</p>"
          }
          <div style="display: flex; gap: 4px; margin-top: 8px;">
            <input placeholder="New subtask" class="subTitle" style="flex: 1; padding: 6px;" />
            <button data-task="${t._id}" class="addSub btn btn-primary" style="padding: 6px 12px; font-size: 12px;">Add</button>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <select class="statusSel" style="flex: 1; padding: 6px;">
          <option value="todo" ${t.status === "todo" ? "selected" : ""}>To Do</option>
          <option value="in_progress" ${t.status === "in_progress" ? "selected" : ""}>In Progress</option>
          <option value="done" ${t.status === "done" ? "selected" : ""}>Done</option>
        </select>
        <button data-task="${t._id}" class="saveTask btn btn-primary">Save</button>
        <button data-task="${t._id}" class="delTask btn btn-outline" style="color: var(--danger);">Delete</button>
      </div>
    `;
    tasksListDiv.appendChild(el);
  });

  // Bind events
  tasksListDiv.querySelectorAll(".addSub").forEach((btn) => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute("data-task");
      const titleInput = btn.parentElement.querySelector(".subTitle");
      const title = titleInput.value.trim();
      if (!title) return;
      const { ok } = await api.post(
        `/api/v1/tasks/${projectId}/t/${taskId}/subtasks`,
        { title },
      );
      if (ok) loadTasks();
    };
  });
  // edit buttons
  tasksListDiv.querySelectorAll(".editTask").forEach((btn) => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute("data-task");
      // load task details and populate form
      const { ok, data } = await api.get(
        `/api/v1/tasks/${projectId}/t/${taskId}`,
      );
      if (!ok) return;
      const t = data.task;
      editingTaskId = taskId;
      saveTaskBtn.textContent = "Update Task";
      taskTitle.value = t.title || "";
      taskDesc.value = t.description || "";
      taskAssignee.value = t.assignee ? t.assignee._id || t.assignee : "";
      taskFiles.value = "";
      taskForm.style.display = "block";
      taskTitle.focus();
    };
  });
  tasksListDiv.querySelectorAll(".toggleSub").forEach((btn) => {
    btn.onclick = async () => {
      const subId = btn.getAttribute("data-sub");
      const isCurrentlyCompleted = btn.textContent.includes("Unmark");
      const { ok } = await api.put(`/api/v1/tasks/st/${subId}`, {
        isCompleted: !isCurrentlyCompleted,
      });
      if (ok) loadTasks();
    };
  });
  tasksListDiv.querySelectorAll(".delSub").forEach((btn) => {
    btn.onclick = async () => {
      const subId = btn.getAttribute("data-del");
      const { ok } = await api.del(`/api/v1/tasks/st/${subId}`);
      if (ok) loadTasks();
    };
  });
  tasksListDiv.querySelectorAll(".saveTask").forEach((btn) => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute("data-task");
      const status = btn.parentElement.querySelector(".statusSel").value;
      const { ok } = await api.put(`/api/v1/tasks/${projectId}/t/${taskId}`, {
        status,
      });
      if (ok) loadTasks();
    };
  });
  tasksListDiv.querySelectorAll(".delTask").forEach((btn) => {
    btn.onclick = async () => {
      const taskId = btn.getAttribute("data-task");
      const { ok } = await api.del(`/api/v1/tasks/${projectId}/t/${taskId}`);
      if (ok) loadTasks();
    };
  });
}

saveTaskBtn.onclick = async () => {
  const title = taskTitle.value.trim();
  const description = taskDesc.value.trim();

  if (!title) {
    taskMsg.textContent = "Task title is required";
    taskMsg.style.color = "var(--danger)";
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description);
  if (taskAssignee.value.trim())
    fd.append("assignee", taskAssignee.value.trim());
  for (const f of taskFiles.files) fd.append("attachments", f);

  let res;
  if (editingTaskId) {
    // update existing task
    res = await api.request(`/api/v1/tasks/${projectId}/t/${editingTaskId}`, {
      method: "PUT",
      formData: fd,
    });
  } else {
    res = await api.upload(`/api/v1/tasks/${projectId}`, fd);
  }

  const { ok, error } = res;
  if (ok) {
    taskMsg.textContent = editingTaskId
      ? "Task updated successfully!"
      : "Task created successfully!";
    taskMsg.style.color = "var(--success)";
    taskTitle.value = "";
    taskDesc.value = "";
    taskAssignee.value = "";
    taskFiles.value = "";
    taskForm.style.display = "none";
    editingTaskId = null;
    saveTaskBtn.textContent = "Create Task";
    setTimeout(() => {
      taskMsg.textContent = "";
      loadTasks();
    }, 500);
  } else {
    taskMsg.textContent =
      error?.message ||
      (editingTaskId ? "Error updating task" : "Error creating task");
    taskMsg.style.color = "var(--danger)";
  }
};

// removed duplicate listener (logic consolidated above)
