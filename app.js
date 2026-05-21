const storageKey = "love-520-records";
const settingsKey = "love-520-settings";
const sessionKey = "love-520-current-user";
const adminAccount = "Liu0420";
const adminPassword = "Liu0420";

const quotes = [
  "想把普通日子过成只有我们懂的纪念日。",
  "和你在一起之后，时间有了更温柔的刻度。",
  "今天也喜欢你，比昨天多一点，比明天少一点。",
  "见过很多风景，最想收藏的还是你看向我的瞬间。",
  "慢慢来，我们有很多很多个以后。"
];

const state = {
  loginRole: "admin",
  currentEditId: "",
  records: readJson(storageKey, []),
  settings: readJson(settingsKey, {
    startDate: "",
    anniversary: "",
    coverImage: "",
    coverDate: ""
  })
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  loginScreen: $("#loginScreen"),
  loginForm: $("#loginForm"),
  loginTitle: $("#loginTitle"),
  loginHint: $("#loginHint"),
  loginStatus: $("#loginStatus"),
  loginButton: $("#loginButton"),
  loginRoleButtons: $$("[data-login-role]"),
  accountField: $("#accountField"),
  passwordField: $("#passwordField"),
  visitorField: $("#visitorField"),
  accountInput: $("#accountInput"),
  passwordInput: $("#passwordInput"),
  visitorNameInput: $("#visitorNameInput"),
  adminOnlyItems: $$("[data-admin-only]"),
  brandTitle: $("#brandTitle"),
  heroTitle: $("#heroTitle"),
  daysTogether: $("#daysTogether"),
  nextAnniversary: $("#nextAnniversary"),
  recordCount: $("#recordCount"),
  coverImage: $("#coverImage"),
  coverInput: $("#coverInput"),
  coverDate: $("#coverDate"),
  timeline: $("#timeline"),
  messageWall: $("#messageWall"),
  photoTimelineSection: $("#photoTimelineSection"),
  messageSection: $("#messageSection"),
  emptyState: $("#emptyState"),
  messageEmptyState: $("#messageEmptyState"),
  recordTemplate: $("#recordTemplate"),
  startDateInput: $("#startDateInput"),
  anniversaryInput: $("#anniversaryInput"),
  settingsForm: $("#settingsForm"),
  photoForm: $("#photoForm"),
  photoInput: $("#photoInput"),
  photoTitleInput: $("#photoTitleInput"),
  photoDateInput: $("#photoDateInput"),
  photoNoteInput: $("#photoNoteInput"),
  messageForm: $("#messageForm"),
  messageInput: $("#messageInput"),
  messagePhotoInput: $("#messagePhotoInput"),
  moodInput: $("#moodInput"),
  quoteText: $("#quoteText"),
  quoteButton: $("#quoteButton"),
  clearButton: $("#clearButton"),
  logoutButton: $("#logoutButton"),
  exportButton: $("#exportButton"),
  editModal: $("#editModal"),
  editForm: $("#editForm"),
  editTitle: $("#editTitle"),
  editPhotoField: $("#editPhotoField"),
  editPhotoInput: $("#editPhotoInput"),
  editRecordTitleLabel: $("#editRecordTitleLabel"),
  editRecordTitleInput: $("#editRecordTitleInput"),
  editDateInput: $("#editDateInput"),
  editNoteLabel: $("#editNoteLabel"),
  editNoteInput: $("#editNoteInput"),
  cancelEditButton: $("#cancelEditButton")
};

init();

function init() {
  const today = new Date().toISOString().slice(0, 10);
  elements.photoDateInput.value = today;
  elements.coverDate.textContent = formatDate(today);
  elements.startDateInput.value = state.settings.startDate;
  elements.anniversaryInput.value = state.settings.anniversary;
  elements.clearButton.textContent = "清空留言";

  setupDateYearControls();
  bindEvents();
  showRandomQuote();
  renderLogin();
  render();
}

function bindEvents() {
  elements.loginRoleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.loginRole = button.dataset.loginRole;
      elements.loginStatus.textContent = "";
      renderLoginFields();
    });
  });

  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleLogin();
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) return;
    state.settings.startDate = elements.startDateInput.value;
    state.settings.anniversary = elements.anniversaryInput.value;
    save(settingsKey, state.settings);
    renderStats();
  });

  elements.photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isAdmin()) return;

    const file = elements.photoInput.files[0];
    if (!file) return;

    const image = await fileToDataUrl(file);
    addRecord({
      type: "photo",
      title: elements.photoTitleInput.value.trim(),
      note: elements.photoNoteInput.value.trim(),
      date: elements.photoDateInput.value,
      image,
      author: currentUser()?.name || "管理员"
    });

    elements.photoForm.reset();
    elements.photoDateInput.value = new Date().toISOString().slice(0, 10);
    scrollToRecords(elements.photoTimelineSection);
  });

  elements.messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = elements.messageInput.value.trim();
    if (!message) return;

    const file = elements.messagePhotoInput.files[0];
    const image = file ? await fileToDataUrl(file) : "";

    addRecord({
      type: "message",
      title: elements.moodInput.value,
      note: message,
      date: new Date().toISOString().slice(0, 10),
      image,
      author: currentUser()?.name || "游客"
    });

    elements.messageForm.reset();
    scrollToRecords(elements.messageSection);
  });

  elements.quoteButton.addEventListener("click", showRandomQuote);

  elements.coverInput.addEventListener("change", async () => {
    if (!isAdmin()) return;
    const file = elements.coverInput.files[0];
    if (!file) return;

    state.settings.coverImage = await fileToDataUrl(file);
    state.settings.coverDate = new Date().toISOString().slice(0, 10);
    save(settingsKey, state.settings);
    elements.coverInput.value = "";
    renderCover();
  });

  elements.logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(sessionKey);
    closeEditModal();
    elements.accountInput.value = "";
    elements.passwordInput.value = "";
    elements.visitorNameInput.value = "";
    renderLogin();
    render();
  });

  elements.clearButton.addEventListener("click", () => {
    if (!isAdmin()) return;
    const ok = confirm("确定清空所有留言吗？照片会保留。");
    if (!ok) return;
    state.records = state.records.filter((record) => record.type !== "message");
    save(storageKey, state.records);
    render();
  });

  elements.exportButton.addEventListener("click", () => {
    if (isAdmin()) exportRecords();
  });

  elements.editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveEditedRecord();
  });

  elements.cancelEditButton.addEventListener("click", closeEditModal);

  elements.editModal.addEventListener("click", (event) => {
    if (event.target === elements.editModal) {
      closeEditModal();
    }
  });
}

function setupDateYearControls() {
  $$('input[type="date"]').forEach((input) => {
    const tools = document.createElement("div");
    tools.className = "date-year-tools";
    tools.innerHTML = `
      <button type="button" data-year-step="-1">上一年</button>
      <button type="button" data-year-step="1">下一年</button>
    `;

    tools.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      adjustDateYear(input, Number(button.dataset.yearStep));
    });

    input.insertAdjacentElement("afterend", tools);
  });
}

function adjustDateYear(input, step) {
  const current = input.value ? new Date(`${input.value}T00:00:00`) : new Date();
  const nextYear = current.getFullYear() + step;
  const month = current.getMonth();
  const day = Math.min(current.getDate(), daysInMonth(nextYear, month));
  const next = new Date(nextYear, month, day);

  input.value = toDateInputValue(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function handleLogin() {
  elements.loginStatus.textContent = "";

  if (state.loginRole === "admin") {
    const account = elements.accountInput.value.trim();
    const password = elements.passwordInput.value;
    if (account !== adminAccount || password !== adminPassword) {
      elements.loginStatus.textContent = "管理员账号或密码不正确。";
      return;
    }
    saveSession({
      role: "admin",
      name: "管理员"
    });
  } else {
    const name = elements.visitorNameInput.value.trim();
    if (!name) {
      elements.loginStatus.textContent = "请先填写游客昵称。";
      return;
    }
    saveSession({
      role: "guest",
      name
    });
  }

  renderLogin();
  render();
}

function renderLogin() {
  const user = currentUser();
  const isUnlocked = Boolean(user);

  document.body.classList.toggle("auth-locked", !isUnlocked);
  elements.loginScreen.classList.toggle("hidden", isUnlocked);
  elements.loginStatus.textContent = "";
  elements.brandTitle.textContent = "我们的 520";
  elements.heroTitle.textContent = user?.role === "guest" ? `欢迎你，${user.name}` : "把喜欢的日子认真存起来";

  renderLoginFields();
  applyPermissions();

  if (!isUnlocked) {
    setTimeout(() => {
      const input = state.loginRole === "admin" ? elements.accountInput : elements.visitorNameInput;
      input.focus();
    }, 0);
  }
}

function renderLoginFields() {
  const isAdminLogin = state.loginRole === "admin";

  elements.loginRoleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.loginRole === state.loginRole);
  });

  elements.accountField.style.display = isAdminLogin ? "grid" : "none";
  elements.passwordField.style.display = isAdminLogin ? "grid" : "none";
  elements.visitorField.style.display = isAdminLogin ? "none" : "grid";
  elements.loginButton.textContent = isAdminLogin ? "管理员登录" : "游客登录";
}

function applyPermissions() {
  const admin = isAdmin();
  elements.adminOnlyItems.forEach((item) => {
    item.classList.toggle("is-hidden", !admin);
  });
}

function addRecord(record) {
  state.records.unshift({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...record
  });
  save(storageKey, state.records);
  render();
}

function render() {
  applyPermissions();
  renderStats();
  renderCover();
  renderRecords();
}

function renderStats() {
  elements.daysTogether.textContent = state.settings.startDate
    ? `${diffDays(state.settings.startDate, new Date())} 天`
    : "未设置";

  elements.nextAnniversary.textContent = state.settings.anniversary
    ? countdownText(state.settings.anniversary)
    : "未设置";

  elements.recordCount.textContent = `${state.records.length} 条`;
}

function renderCover() {
  if (state.settings.coverImage) {
    elements.coverImage.src = state.settings.coverImage;
    elements.coverDate.textContent = formatDate(state.settings.coverDate || new Date().toISOString().slice(0, 10));
    return;
  }

  const latestPhoto = state.records.find((record) => record.type === "photo");
  if (!latestPhoto) return;
  elements.coverImage.src = latestPhoto.image;
  elements.coverDate.textContent = formatDate(latestPhoto.date);
}

function renderRecords() {
  elements.timeline.innerHTML = "";
  elements.messageWall.innerHTML = "";

  const photos = state.records.filter((record) => record.type === "photo");
  const messages = state.records.filter((record) => record.type === "message");
  elements.emptyState.classList.toggle("show", photos.length === 0);
  elements.messageEmptyState.classList.toggle("show", messages.length === 0);

  messages.forEach((record) => {
    elements.messageWall.append(createRecordCard(record));
  });

  photos.forEach((record) => {
    elements.timeline.append(createRecordCard(record));
  });
}

function createRecordCard(record) {
    const card = elements.recordTemplate.content.firstElementChild.cloneNode(true);
    const media = card.querySelector(".record-media");
    const type = card.querySelector(".record-type");
    const time = card.querySelector("time");
    const title = card.querySelector("h3");
    const note = card.querySelector("p");
    const editButton = card.querySelector(".edit-button");
    const deleteButton = card.querySelector(".delete-button");

    type.textContent = record.type === "photo" ? "照片" : `留言 · ${record.author || "游客"}`;
    time.textContent = formatDate(record.date);
    title.textContent = record.title;
    note.textContent = record.note || "这一刻没有写下文字，但已经被好好保存。";

    if (record.image) {
      const image = document.createElement("img");
      image.src = record.image;
      image.alt = record.title;
      media.append(image);
    } else {
      media.innerHTML = `<div class="message-mark">${record.title}</div>`;
    }

    const canEdit = isAdmin();
    const canDeleteRecord = isAdmin();
    editButton.classList.toggle("is-hidden", !canEdit);
    editButton.addEventListener("click", () => {
      if (!canEdit) return;
      editRecord(record.id);
    });

    deleteButton.classList.toggle("is-hidden", !canDeleteRecord);
    deleteButton.addEventListener("click", () => {
      if (!canDeleteRecord) return;
      state.records = state.records.filter((item) => item.id !== record.id);
      save(storageKey, state.records);
      render();
    });

    return card;
}

function scrollToRecords(section) {
  document.activeElement?.blur();
  setTimeout(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 80);
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  const isPhoto = record.type === "photo";
  state.currentEditId = id;
  elements.editTitle.textContent = isPhoto ? "修改照片记录" : "修改留言";
  elements.editPhotoField.style.display = "grid";
  elements.editRecordTitleLabel.textContent = isPhoto ? "标题" : "心情";
  elements.editNoteLabel.textContent = isPhoto ? "一句话" : "留言内容";
  elements.editRecordTitleInput.value = record.title;
  elements.editDateInput.value = record.date;
  elements.editNoteInput.value = record.note || "";
  elements.editPhotoInput.value = "";
  elements.editModal.classList.remove("hidden");
  elements.editModal.setAttribute("aria-hidden", "false");
  setTimeout(() => elements.editRecordTitleInput.focus(), 0);
}

async function saveEditedRecord() {
  const record = state.records.find((item) => item.id === state.currentEditId);
  if (!record || !isAdmin()) return;

  record.title = elements.editRecordTitleInput.value.trim() || record.title;
  record.date = elements.editDateInput.value;
  record.note = elements.editNoteInput.value.trim();

  const file = elements.editPhotoInput.files[0];
  if (file) {
    record.image = await fileToDataUrl(file);
  }

  save(storageKey, state.records);
  closeEditModal();
  render();
}

function closeEditModal() {
  state.currentEditId = "";
  elements.editModal.classList.add("hidden");
  elements.editModal.setAttribute("aria-hidden", "true");
  elements.editForm.reset();
}

function showRandomQuote() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  elements.quoteText.textContent = quote;
}

function exportRecords() {
  const data = {
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    records: state.records
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "love-520-records.json";
  link.click();
  URL.revokeObjectURL(url);
}

function currentUser() {
  return readSession(sessionKey);
}

function isAdmin() {
  return currentUser()?.role === "admin";
}

function saveSession(value) {
  sessionStorage.setItem(sessionKey, JSON.stringify(value));
}

function readSession(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function diffDays(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(end);
  const diff = endDate - startDate;
  return Math.max(0, Math.floor(diff / 86400000) + 1);
}

function countdownText(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((target - today) / 86400000);
  if (days > 0) return `还有 ${days} 天`;
  if (days === 0) return "就是今天";
  return `已过去 ${Math.abs(days)} 天`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}
