function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

let currentProjectId = null;
let currentProject = null;
const STATUSES = ["todo", "in_progress", "done"];

// ---------- Project list ----------
async function loadProjects() {
  const res = await fetch("/api/projects");
  const projects = await res.json();

  const container = document.getElementById("projects");
  container.innerHTML = projects
    .map(
      (p) => `
    <div class="card" data-id="${p.id}">
      <span class="badge ${p.status}">${p.status.replace("_", " ")}</span>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <div class="dates">${p.start_date || "?"} → ${p.due_date || "?"}</div>
    </div>
  `,
    )
    .join("");
}

// ---------- Project pop-up ----------
function statusSelect(task) {
  return `<select class="status-select ${task.status}" data-task="${task.id}">
    ${STATUSES.map(
      (s) =>
        `<option value="${s}" ${s === task.status ? "selected" : ""}>${s.replace("_", " ")}</option>`,
    ).join("")}
  </select>`;
}

async function openProject(id) {
  currentProjectId = id;

  const [projectRes, devsRes] = await Promise.all([
    fetch(`/api/projects/${id}`),
    fetch("/api/developers"),
  ]);
  const p = await projectRes.json();
  const allDevs = await devsRes.json();
  currentProject = p;

  const available = allDevs.filter((d) => !p.team.some((m) => m.id === d.id));

  const teamHtml = p.team.length
    ? p.team
        .map(
          (d) =>
            `<span class="chip">${escapeHtml(d.name)}<small>${escapeHtml(d.role)}</small><button class="chip-x" data-remove="${d.id}" title="Remove from team">&times;</button></span>`,
        )
        .join("")
    : '<p class="empty">No developers assigned yet.</p>';

  const addMemberHtml = available.length
    ? `<div class="add-member">
         <select id="member-select">
           ${available.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("")}
         </select>
         <button class="btn" id="add-member">Add to team</button>
       </div>`
    : '<p class="empty">All developers are already on this project.</p>';

  const tasksHtml = p.tasks.length
    ? p.tasks
        .map(
          (t) => `
        <div class="task">
          <div>${escapeHtml(t.title)}<small>${escapeHtml(t.developer_name || "Unassigned")} · Due: ${t.due_date || "not set"} · ${t.priority} priority</small></div>
          <div class="task-actions">
            ${statusSelect(t)}
            <button class="task-x" data-delete-task="${t.id}" title="Delete task">&times;</button>
          </div>
        </div>`,
        )
        .join("")
    : '<p class="empty">No tasks yet.</p>';

  const assigneeOptions =
    '<option value="">Unassigned</option>' +
    p.team
      .map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
      .join("");

  document.getElementById("modal-content").innerHTML = `
    <h2>${escapeHtml(p.name)}</h2>
    <span class="badge ${p.status}">${p.status.replace("_", " ")}</span>
    <div class="modal-actions">
      <button class="btn" id="edit-project">Edit</button>
      <button class="btn danger" id="delete-project">Delete</button>
    </div>
    <p>${escapeHtml(p.description)}</p>

    <h4>Team (${p.team.length})</h4>
    <div class="chips">${teamHtml}</div>
    ${addMemberHtml}

    <h4>Tasks (${p.tasks.length})</h4>
    ${tasksHtml}

    <h4>Add a task</h4>
    <div class="task-form">
      <input id="task-title" type="text" placeholder="Task title">
      <div class="row">
        <select id="task-assignee">${assigneeOptions}</select>
        <select id="task-priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
        <input id="task-due" type="date">
      </div>
      <p id="task-error" class="form-error"></p>
      <button class="btn" id="add-task">Add task</button>
    </div>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// ---------- New / edit project form ----------
function openProjectForm(project = null) {
  const editing = project !== null;

  document.getElementById("modal-content").innerHTML = `
    <h2>${editing ? "Edit Project" : "New Project"}</h2>
    <form id="project-form">
      <label>Name
        <input type="text" name="name" required>
      </label>
      <label>Description
        <textarea name="description"></textarea>
      </label>
      <label>Status
        <select name="status">
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <div class="row">
        <div><label>Start date <input type="date" name="start_date"></label></div>
        <div><label>Due date <input type="date" name="due_date"></label></div>
      </div>
      <p id="form-error" class="form-error"></p>
      <button type="submit" class="btn">${editing ? "Save changes" : "Save project"}</button>
    </form>
  `;
  document.getElementById("modal").classList.remove("hidden");

  const form = document.getElementById("project-form");

  // When editing, fill the form with the current values
  if (editing) {
    form.elements["name"].value = project.name;
    form.elements["description"].value = project.description || "";
    form.elements["status"].value = project.status;
    form.elements["start_date"].value = project.start_date || "";
    form.elements["due_date"].value = project.due_date || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const res = await fetch(
      editing ? `/api/projects/${project.id}` : "/api/projects",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      document.getElementById("form-error").textContent = err.error;
      return;
    }

    loadProjects();
    if (editing) {
      openProject(project.id); // go back to the project's pop-up
    } else {
      closeModal();
    }
  });
}

// ---------- Event listeners ----------
// Click a card to open it
document.getElementById("projects").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openProject(card.dataset.id);
});

// New project button
document
  .getElementById("new-project")
  .addEventListener("click", () => openProjectForm());

// Close with the X button, by clicking the dark background, or with Esc
document.getElementById("close-modal").addEventListener("click", closeModal);
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// One listener handles every button inside the pop-up
const modalContent = document.getElementById("modal-content");

modalContent.addEventListener("click", async (e) => {
  // Edit this project
  if (e.target.id === "edit-project") {
    openProjectForm(currentProject);
    return;
  }

  // Delete this project
  if (e.target.id === "delete-project") {
    if (confirm("Delete this project? Its tasks will be deleted too.")) {
      await fetch(`/api/projects/${currentProjectId}`, { method: "DELETE" });
      closeModal();
      loadProjects();
    }
    return;
  }

  // Remove a team member
  const removeBtn = e.target.closest("[data-remove]");
  if (removeBtn) {
    await fetch(
      `/api/projects/${currentProjectId}/developers/${removeBtn.dataset.remove}`,
      { method: "DELETE" },
    );
    openProject(currentProjectId);
    return;
  }

  // Add a team member
  if (e.target.id === "add-member") {
    const select = document.getElementById("member-select");
    await fetch(`/api/projects/${currentProjectId}/developers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ developer_id: Number(select.value) }),
    });
    openProject(currentProjectId);
    return;
  }

  // Add a task
  if (e.target.id === "add-task") {
    const title = document.getElementById("task-title").value.trim();
    if (!title) {
      document.getElementById("task-error").textContent =
        "Task title is required";
      return;
    }
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: currentProjectId,
        title,
        assigned_to: document.getElementById("task-assignee").value || null,
        priority: document.getElementById("task-priority").value,
        due_date: document.getElementById("task-due").value || null,
      }),
    });
    openProject(currentProjectId);
    return;
  }

  // Delete a task
  const deleteBtn = e.target.closest("[data-delete-task]");
  if (deleteBtn && confirm("Delete this task?")) {
    await fetch(`/api/tasks/${deleteBtn.dataset.deleteTask}`, {
      method: "DELETE",
    });
    openProject(currentProjectId);
  }
});

// Change a task's status from its dropdown
modalContent.addEventListener("change", async (e) => {
  if (e.target.classList.contains("status-select")) {
    await fetch(`/api/tasks/${e.target.dataset.task}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    openProject(currentProjectId);
  }
});

// ---------- Developers section ----------
async function loadDevelopers() {
  const res = await fetch("/api/developers");
  const devs = await res.json();

  document.getElementById("developers").innerHTML = devs
    .map(
      (d) => `
    <div class="dev-row">
      <div>${escapeHtml(d.name)}<small>${escapeHtml(d.email)}</small></div>
      <div class="dev-actions">
        <span class="dev-role">${escapeHtml(d.role)}</span>
        <button class="task-x" data-delete-dev="${d.id}" title="Delete developer">&times;</button>
      </div>
    </div>`,
    )
    .join("");
}

function openDeveloperForm() {
  document.getElementById("modal-content").innerHTML = `
    <h2>New Developer</h2>
    <form id="developer-form">
      <label>Name <input type="text" name="name" required></label>
      <label>Email <input type="email" name="email" required></label>
      <label>Role <input type="text" name="role" placeholder="e.g. Backend Developer"></label>
      <p id="form-error" class="form-error"></p>
      <button type="submit" class="btn">Save developer</button>
    </form>
  `;
  document.getElementById("modal").classList.remove("hidden");

  document
    .getElementById("developer-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));

      const res = await fetch("/api/developers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        document.getElementById("form-error").textContent = err.error;
        return;
      }
      closeModal();
      loadDevelopers();
    });
}

document
  .getElementById("new-developer")
  .addEventListener("click", openDeveloperForm);

document.getElementById("developers").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-delete-dev]");
  if (!btn) return;
  if (
    confirm(
      "Delete this developer? They will be removed from all project teams, and their tasks become unassigned.",
    )
  ) {
    await fetch(`/api/developers/${btn.dataset.deleteDev}`, {
      method: "DELETE",
    });
    loadDevelopers();
    loadProjects();
  }
});

loadProjects();
loadDevelopers();
