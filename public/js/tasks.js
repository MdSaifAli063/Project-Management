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

async function loadTasks() {
  const projectId = qs("projectId");
  const userResp = await currentUser();
  const isAdmin = userResp.user && userResp.user.role === "admin";
  const isProjAdmin = userResp.user && userResp.user.role === "project_admin";
  const res = await request(`/tasks/${projectId}`);
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  res.tasks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "card";
    let html = `<strong>${t.title}</strong> [${t.status}]`;
    if (t.assignee)
      html += ` - assigned to ${t.assignee.name || t.assignee.email}`;
    if (t.attachments && t.attachments.length) {
      html += `<div>Attachments:`;
      t.attachments.forEach((a) => {
        html += ` <a href="${a.url}" target="_blank">${a.originalName}</a>`;
      });
      html += `</div>`;
    }
    li.innerHTML = html;
    if (isAdmin || isProjAdmin) {
      const statusSel = document.createElement("select");
      ["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        if (s === t.status) opt.selected = true;
        statusSel.appendChild(opt);
      });
      statusSel.addEventListener("change", async () => {
        try {
          await request(`/tasks/${projectId}/t/${t._id}`, {
            method: "PUT",
            body: JSON.stringify({ status: statusSel.value }),
          });
          showMessage("success", "Status updated");
          await loadTasks();
        } catch (e) {
          showMessage("error", e.message || "Failed");
        }
      });
      li.appendChild(statusSel);
    }

    // show subtasks
    if (t.subtasks && t.subtasks.length) {
      const ul = document.createElement("ul");
      t.subtasks.forEach((st) => {
        const sti = document.createElement("li");
        sti.textContent = `${st.title} ${st.isCompleted ? "(✓)" : ""}`;
        // allow marking complete/uncomplete
        const btn = document.createElement("button");
        btn.textContent = "toggle";
        btn.addEventListener("click", async () => {
          await request(`/tasks/st/${st._id}`, {
            method: "PUT",
            body: JSON.stringify({ isCompleted: !st.isCompleted }),
          });
          await loadTasks();
        });
        sti.appendChild(btn);
        // delete subtask for admins/proj admins
        if (isAdmin || isProjAdmin) {
          const del = document.createElement("button");
          del.textContent = "delete";
          del.className = "small";
          del.addEventListener("click", async () => {
            try {
              await request(`/tasks/st/${st._id}`, {
                method: "DELETE",
              });
              showMessage("success", "Subtask deleted");
              await loadTasks();
            } catch (err) {
              showMessage("error", err.message || "Failed");
            }
          });
          sti.appendChild(del);
        }
        ul.appendChild(sti);
      });
      li.appendChild(ul);
    }
    // add subtask button for admin/project_admin
    if (isAdmin || isProjAdmin) {
      const addStBtn = document.createElement("button");
      addStBtn.textContent = "Add subtask";
      addStBtn.className = "small";
      addStBtn.addEventListener("click", async () => {
        const title = prompt("Subtask title");
        if (!title) return;
        await request(`/tasks/${projectId}/t/${t._id}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ title }),
        });
        await loadTasks();
      });
      li.appendChild(addStBtn);
    }

    // edit/delete task if allowed
    if (isAdmin || isProjAdmin) {
      const edit = document.createElement("button");
      edit.textContent = "edit";
      edit.className = "small";
      edit.addEventListener("click", async () => {
        const newTitle = prompt("Title", t.title);
        if (newTitle == null) return;
        const newDesc = prompt("Description", t.description || "");
        try {
          await request(`/tasks/${projectId}/t/${t._id}`, {
            method: "PUT",
            body: JSON.stringify({ title: newTitle, description: newDesc }),
          });
          showMessage("success", "Task updated");
          await loadTasks();
        } catch (err) {
          showMessage("error", err.message || "Update failed");
        }
      });
      li.appendChild(edit);

      const delTask = document.createElement("button");
      delTask.textContent = "delete";
      delTask.className = "small";
      delTask.addEventListener("click", async () => {
        if (!confirm("Delete task?")) return;
        try {
          await request(`/tasks/${projectId}/t/${t._id}`, { method: "DELETE" });
          showMessage("success", "Task deleted");
          await loadTasks();
        } catch (err) {
          showMessage("error", err.message || "Delete failed");
        }
      });
      li.appendChild(delTask);
    }

    list.appendChild(li);
  });
}

async function init() {
  const projectId = qs("projectId");
  const createForm = document.getElementById("createTaskForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("taskTitle").value;
      const description = document.getElementById("taskDesc").value;
      const files = document.getElementById("taskFiles").files;
      const form = new FormData();
      form.append("title", title);
      form.append("description", description);
      for (let i = 0; i < files.length; i++) {
        form.append("attachments", files[i]);
      }
      try {
        await request(`/tasks/${projectId}`, { method: "POST", body: form });
        showMessage("success", "Task created");
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDesc").value = "";
        document.getElementById("taskFiles").value = "";
        await loadTasks();
      } catch (err) {
        showMessage("error", err.message || "Creation failed");
      }
    });
  }
  await loadTasks();
}

init();
