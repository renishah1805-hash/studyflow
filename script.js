// ===== StudyFlow: assignment tracker =====
const STORAGE_KEY = "studyflow.assignments";

// ---- State ----
let assignments = loadAssignments();
const filters = { search: "", subject: "All", priority: "All", status: "All", sort: "due" };

// ---- Element shortcuts ----
const $ = (id) => document.getElementById(id);
const modal = $("modal");
const form = $("assignmentForm");

// ---- Dates ----
// Returns today's LOCAL date as "YYYY-MM-DD" so it can be compared with the date input value.
function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
// Overdue = due date before today AND still Pending. Due today is NOT overdue.
function isOverdue(a) {
  return a.status === "Pending" && a.dueDate < todayString();
}

// ---- Local Storage ----
function isValidAssignment(a) {
  return a && typeof a.id === "string" && typeof a.title === "string" && a.title.trim() !== ""
    && typeof a.subject === "string" && a.subject.trim() !== ""
    && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate)
    && ["Low", "Medium", "High"].includes(a.priority)
    && ["Pending", "Completed"].includes(a.status);
}
function loadAssignments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createSamples();            // first visit: show demo data
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidAssignment) : [];  // drop bad records
  } catch (error) {
    return [];                                           // corrupted data: start clean
  }
}
function saveAssignments() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); } catch (e) { /* storage full/blocked */ }
}

// ---- Sample data ----
function createSamples() {
  const make = (title, subject, days, priority, status = "Pending") =>
    ({ id: newId(), title, subject, dueDate: addDays(days), priority, status, sample: true, createdAt: Date.now() });
  return [
    make("Calculus problem set 4", "Math", -2, "High"),
    make("Lab report: titration", "Chemistry", 0, "Medium"),
    make("Essay draft on Romanticism", "English", 5, "Low"),
    make("Database ER diagram", "Computer Science", 9, "High"),
    make("Reading response", "English", -5, "Low", "Completed"),
  ];
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function toggleSamples() {
  if (assignments.some((a) => a.sample)) {
    assignments = assignments.filter((a) => !a.sample);
  } else {
    assignments = assignments.concat(createSamples());
  }
  saveAssignments();
  render();
}

// ---- Add / status / delete ----
function addAssignment(data) {
  assignments.push({ id: newId(), ...data, status: "Pending", createdAt: Date.now() });
  saveAssignments();
  render();
}
function toggleStatus(id) {
  const a = assignments.find((x) => x.id === id);
  if (!a) return;
  a.status = a.status === "Pending" ? "Completed" : "Pending";
  saveAssignments();
  render();
}
function deleteAssignment(id) {
  const a = assignments.find((x) => x.id === id);
  if (a && confirm(`Delete "${a.title}"? This cannot be undone.`)) {
    assignments = assignments.filter((x) => x.id !== id);
    saveAssignments();
    render();
  }
}

// ---- Validation ----
function showError(id, message) { $(id).textContent = message; }
function validateForm() {
  const title = $("titleInput").value.trim().replace(/\s+/g, " ");
  const subject = $("subjectInput").value.trim().replace(/\s+/g, " ");
  const dueDate = $("dueInput").value;
  showError("titleError", title ? "" : "Enter an assignment title.");
  showError("subjectError", subject ? "" : "Enter a subject.");
  showError("dueError", dueDate ? "" : "Choose a due date.");
  if (!title || !subject || !dueDate) return null;       // invalid: nothing is saved
  return { title, subject, dueDate, priority: $("priorityInput").value };
}

// ---- Filtering & sorting ----
function getVisibleAssignments() {
  const term = filters.search.trim().toLowerCase();
  const list = assignments.filter((a) =>
    a.title.toLowerCase().includes(term) &&
    (filters.subject === "All" || a.subject === filters.subject) &&
    (filters.priority === "All" || a.priority === filters.priority) &&
    (filters.status === "All" || a.status === filters.status));
  return list.sort((a, b) => filters.sort === "due"
    ? a.dueDate.localeCompare(b.dueDate) : b.createdAt - a.createdAt);
}
function refreshSubjectOptions() {
  const select = $("subjectFilter");
  const subjects = [...new Set(assignments.map((a) => a.subject))].sort();
  if (filters.subject !== "All" && !subjects.includes(filters.subject)) filters.subject = "All";
  select.innerHTML = "";
  ["All", ...subjects].forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s === "All" ? "All subjects" : s;
    select.appendChild(opt);
  });
  select.value = filters.subject;
}

// ---- Rendering ----
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;   // textContent keeps user input safe
  return node;
}
function buildItem(a) {
  const overdue = isOverdue(a);
  const item = el("article", "item" + (overdue ? " overdue" : "") + (a.status === "Completed" ? " completed" : ""));
  const body = el("div", "item-body");
  body.appendChild(el("h3", "", a.title));
  const meta = el("div", "meta");
  meta.append(el("span", "", a.subject), el("span", "", "Due " + formatDate(a.dueDate)),
    el("span", "badge " + a.priority, a.priority));
  if (overdue) meta.appendChild(el("span", "badge overdue", "Overdue"));
  if (a.status === "Completed") meta.appendChild(el("span", "badge Low", "Completed"));
  body.appendChild(meta);

  const actions = el("div", "actions");
  const doneBtn = el("button", "btn btn-small btn-primary", a.status === "Pending" ? "Mark completed" : "Mark pending");
  doneBtn.type = "button";
  doneBtn.addEventListener("click", () => toggleStatus(a.id));
  const delBtn = el("button", "btn btn-small btn-ghost", "Delete");
  delBtn.type = "button";
  delBtn.addEventListener("click", () => deleteAssignment(a.id));
  actions.append(doneBtn, delBtn);
  item.append(body, actions);
  return item;
}
function render() {
  // Dashboard counts
  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "Completed").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  $("totalCount").textContent = total;
  $("pendingCount").textContent = total - completed;
  $("completedCount").textContent = completed;
  $("progressText").textContent = percent + "%";
  $("progressFill").style.width = percent + "%";
  const overdueCount = assignments.filter(isOverdue).length;
  $("welcomeSub").textContent = total === 0 ? "Add your first assignment to get started."
    : overdueCount ? `You have ${overdueCount} overdue ${overdueCount === 1 ? "assignment" : "assignments"}. Let's catch up!`
    : "Nothing overdue. Keep it up!";
  $("toggleSamples").textContent = assignments.some((a) => a.sample) ? "Remove sample data" : "Load sample data";

  refreshSubjectOptions();

  // List + empty states
  const visible = getVisibleAssignments();
  const list = $("assignmentList");
  list.innerHTML = "";
  visible.forEach((a) => list.appendChild(buildItem(a)));

  const empty = $("emptyState");
  empty.hidden = visible.length > 0;
  if (!empty.hidden) {
    empty.innerHTML = "";
    if (total === 0) {
      empty.append(el("div", "", "🎓"), el("h3", "", "No assignments yet"),
        el("p", "", "Click “Add Assignment” to add your first one."));
    } else {
      empty.append(el("div", "", "🔍"), el("h3", "", "No assignments match your search"),
        el("p", "", "Try a different search or clear the filters."));
    }
  }
  // Highlight the active sidebar link to match the status filter
  document.querySelectorAll(".nav-link").forEach((l) =>
    l.classList.toggle("active", l.dataset.status === filters.status));
}

// ---- Modal ----
function openModal() {
  form.reset();
  ["titleError", "subjectError", "dueError"].forEach((id) => showError(id, ""));
  $("priorityInput").value = "Medium";
  modal.hidden = false;
  $("titleInput").focus();
}
function closeModal() { modal.hidden = true; $("openModal").focus(); }

// ---- Events ----
$("openModal").addEventListener("click", openModal);
$("cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = validateForm();
  if (data) { addAssignment(data); closeModal(); }
});
$("toggleSamples").addEventListener("click", toggleSamples);

$("searchInput").addEventListener("input", (e) => { filters.search = e.target.value; render(); });
$("subjectFilter").addEventListener("change", (e) => { filters.subject = e.target.value; render(); });
$("priorityFilter").addEventListener("change", (e) => { filters.priority = e.target.value; render(); });
$("statusFilter").addEventListener("change", (e) => { filters.status = e.target.value; syncStatusSelect(); render(); });
$("sortSelect").addEventListener("change", (e) => { filters.sort = e.target.value; render(); });
$("clearFilters").addEventListener("click", () => {
  Object.assign(filters, { search: "", subject: "All", priority: "All", status: "All" });
  $("searchInput").value = "";
  $("priorityFilter").value = "All";
  syncStatusSelect();
  render();
});
document.querySelectorAll(".nav-link").forEach((link) =>
  link.addEventListener("click", (e) => {
    e.preventDefault();
    filters.status = link.dataset.status;
    syncStatusSelect();
    render();
  }));
function syncStatusSelect() { $("statusFilter").value = filters.status; }

// ---- Start ----
$("welcomeText").textContent = "Welcome to StudyFlow!";
saveAssignments();   // stores sample data on first visit so later refreshes load from storage
render();
