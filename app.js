let config = null;
let tasks = [];
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const submitBtn = document.getElementById("task-submit");
const listEl = document.getElementById("task-list");
const statusEl = document.getElementById("status-message");

function showMessage(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "red" : "green";
}

async function api(path, options = {}) {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    tasks = await api(`${config.tableName}?select=*&order=id.asc`);
    renderTasks();
    showMessage(`Loaded ${tasks.length} task(s).`);
  } catch (err) {
    showMessage("Could not load tasks: " + err.message, true);
  }
}

function renderTasks() {
  listEl.innerHTML = "";
  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.dataset.id = task.id;

    const title = document.createElement("strong");
    title.className = "task-title";
    title.textContent = task.title;

    const desc = document.createElement("span");
    desc.className = "task-description";
    desc.textContent = task.description || "";

    const status = document.createElement("em");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Not completed";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-task";
    editBtn.textContent = "Edit";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-task";
    toggleBtn.textContent = task.completed ? "Mark incomplete" : "Mark completed";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-task";
    deleteBtn.textContent = "Delete";

    item.append(title, " ", desc, " ", status, " ", editBtn, toggleBtn, deleteBtn);
    listEl.appendChild(item);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) {
    showMessage("Title is required.", true);
    return;
  }
  try {
    if (editingId === null) {
      await api(config.tableName, {
        method: "POST",
        body: JSON.stringify({ title, description, completed: false }),
      });
      showMessage("Task added.");
    } else {
      await api(`${config.tableName}?id=eq.${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description }),
      });
      showMessage("Task updated.");
      editingId = null;
      submitBtn.textContent = "Add Task";
    }
    form.reset();
    await loadTasks();
  } catch (err) {
    showMessage("Operation failed: " + err.message, true);
  }
});

listEl.addEventListener("click", async (e) => {
  const item = e.target.closest(".task-item");
  if (!item) return;
  const id = Number(item.dataset.id);
  const task = tasks.find((t) => t.id === id);

  try {
    if (e.target.classList.contains("delete-task")) {
      await api(`${config.tableName}?id=eq.${id}`, { method: "DELETE" });
      showMessage("Task deleted.");
      await loadTasks();
    } else if (e.target.classList.contains("toggle-task")) {
      await api(`${config.tableName}?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      showMessage("Status changed.");
      await loadTasks();
    } else if (e.target.classList.contains("edit-task")) {
      editingId = id;
      titleInput.value = task.title;
      descInput.value = task.description || "";
      submitBtn.textContent = "Save Changes";
      titleInput.focus();
    }
  } catch (err) {
    showMessage("Operation failed: " + err.message, true);
  }
});

(async function init() {
  try {
    const res = await fetch("config.json");
    if (!res.ok) throw new Error("config.json not found");
    config = await res.json();
    await loadTasks();
  } catch (err) {
    showMessage("Initialization error: " + err.message, true);
  }
})();