const STORAGE_KEY = "greensupport.tickets";
const PASSWORD_KEY = "greensupport.admin.auth";
const ADMIN_PASSWORD = "X123456x";
const OVERDUE_MS = 2 * 24 * 60 * 60 * 1000;

const ticketList = document.getElementById("ticket-list");
const editForm = document.getElementById("edit-form");
const doneFields = document.getElementById("done-fields");
const passwordOverlay = document.getElementById("password-overlay");
const passwordForm = document.getElementById("password-form");
const passwordError = document.getElementById("password-error");
const soundToggle = document.getElementById("sound-toggle");
const statsToggle = document.getElementById("stats-toggle");
const editorDrawer = document.getElementById("editor-drawer");
const closeEditorButton = document.getElementById("close-editor");
const filterAllButton = document.getElementById("filter-all");
const filterQueuedButton = document.getElementById("filter-queued");
const filterCompletedButton = document.getElementById("filter-completed");
const statsModal = document.getElementById("stats-modal");
const closeStatsButton = document.getElementById("close-stats");
const statsPeriod = document.getElementById("stats-period");
const statsContent = document.getElementById("stats-content");
const ticketSearch = document.getElementById("ticket-search");
const goHomeButton = document.getElementById("go-home");

let lastTicketCount = 0;
let soundEnabled = false;
let audioContext;
let activeFilter = "all";
let searchQuery = "";

const getTickets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTickets = (tickets) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

const formatDateTime = (value) =>
  new Date(value).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

const applyQueueRules = (tickets) => {
  const now = Date.now();

  const normalized = tickets.map((ticket) => {
    const isPending = ticket.status !== "виконано";
    const isOverdue = isPending && now - new Date(ticket.submissionDate).getTime() > OVERDUE_MS;
    return { ...ticket, isOverdue };
  });

  return [...normalized].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.queueNumber - b.queueNumber;
  });
};

const syncTickets = () => {
  const current = getTickets();
  const updated = applyQueueRules(current);
  if (JSON.stringify(current) !== JSON.stringify(updated)) {
    saveTickets(updated);
  }
  return updated;
};

const getVisibleTickets = (tickets) => {
  return tickets.filter((ticket) => {
    const isCompleted = ticket.status === "виконано";
    if (activeFilter === "queued" && isCompleted) return false;
    if (activeFilter === "completed" && !isCompleted) return false;

    if (!searchQuery) return true;

    const haystack = [
      String(ticket.queueNumber),
      ticket.fullName,
      ticket.serviceNumber,
      ticket.category,
      ticket.description,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery);
  });
};

const setActiveFilterButton = () => {
  const map = {
    all: filterAllButton,
    queued: filterQueuedButton,
    completed: filterCompletedButton,
  };

  [filterAllButton, filterQueuedButton, filterCompletedButton].forEach((button) => {
    if (!button) return;
    button.classList.remove("is-active");
  });

  map[activeFilter]?.classList.add("is-active");
};

const statusClass = (ticket) => {
  if (ticket.status === "виконано") return "status-done";
  if (ticket.isOverdue) return "status-overdue";
  return "status-queue";
};

const statusLabel = (ticket) => {
  if (ticket.status === "виконано") return "Виконано";
  if (ticket.isOverdue) return "В черзі понад 2 дні";
  return "В черзі";
};

const renderTicketList = (tickets) => {
  const visible = getVisibleTickets(tickets);
  if (visible.length === 0) {
    ticketList.innerHTML = "<p>Немає заявок за обраним фільтром.</p>";
    return;
  }

  ticketList.innerHTML = visible
    .map(
      (ticket) => `
      <div class="ticket-card ${statusClass(ticket)}" data-id="${ticket.id}">
        <div class="ticket-status-left">${statusLabel(ticket)}</div>
        <div class="ticket-main">
          <h3>№${ticket.queueNumber} · ${ticket.fullName}</h3>
          <div class="ticket-meta">
            <span>Категорія проблеми: ${ticket.category}</span>
            <span>Подача: ${formatDateTime(ticket.submissionDate)}</span>
          </div>
          <p>${ticket.description}</p>
          <div class="ticket-actions">
            <button class="secondary" type="button" data-action="edit" data-id="${ticket.id}">Редагувати</button>
            <button class="secondary" type="button" data-action="delete" data-id="${ticket.id}">Видалити</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
};

const populateForm = (ticket) => {
  editForm.id.value = ticket.id;
  editForm.fullName.value = ticket.fullName;
  editForm.serviceNumber.value = ticket.serviceNumber;
  editForm.category.value = ticket.category;
  editForm.description.value = ticket.description;
  editForm.status.value = ticket.status;
  editForm.executor.value = ticket.executor || "";
  editForm.requesterIp.value = ticket.requesterIp || "Невідомо";
  editForm.requesterHost.value = ticket.requesterHost || "Невідомо";
  editForm.requesterDevice.value = ticket.requesterDevice || "Невідомо";
  toggleDoneFields(ticket.status);
};

const toggleDoneFields = (status) => {
  if (status === "виконано") {
    doneFields.hidden = false;
  } else {
    doneFields.hidden = true;
    editForm.executor.value = "";
  }
};

const showPasswordOverlay = () => {
  passwordOverlay.style.display = "flex";
};
const hidePasswordOverlay = () => {
  passwordOverlay.style.display = "none";
};
const ensureAuth = () => {
  if (sessionStorage.getItem(PASSWORD_KEY) === "true") {
    hidePasswordOverlay();
    return;
  }
  showPasswordOverlay();
};

const playBeep = () => {
  if (!soundEnabled) return;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 620;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  setTimeout(() => oscillator.stop(), 260);
};

const computeStats = (tickets, period) => {
  const now = Date.now();
  const periods = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  const scope = tickets.filter((ticket) => now - new Date(ticket.submissionDate).getTime() <= periods[period]);
  const submitted = scope.length;
  const completed = scope.filter((ticket) => ticket.status === "виконано").length;

  const byExecutor = scope
    .filter((ticket) => ticket.status === "виконано" && ticket.executor)
    .reduce((acc, ticket) => {
      acc[ticket.executor] = (acc[ticket.executor] || 0) + 1;
      return acc;
    }, {});

  return { submitted, completed, byExecutor };
};

const renderStats = () => {
  const tickets = syncTickets();
  const stats = computeStats(tickets, statsPeriod.value);
  const executors = Object.entries(stats.byExecutor).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...executors.map(([, count]) => count), 1);

  const bars = executors
    .map(([name, count]) => {
      const width = Math.round((count / max) * 100);
      return `
        <div class="stat-row">
          <div class="stat-head"><span>${name}</span><strong>${count}</strong></div>
          <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${width}%"></div></div>
        </div>
      `;
    })
    .join("");

  statsContent.innerHTML = `
    <div class="stats-headline">Аналітика виконання заявок за обраний період</div>
    <div class="stats-summary">
      <div><span>Подано заявок</span><strong>${stats.submitted}</strong></div>
      <div><span>Виконано заявок</span><strong>${stats.completed}</strong></div>
      <div><span>Відсоток виконання</span><strong>${stats.submitted ? Math.round((stats.completed / stats.submitted) * 100) : 0}%</strong></div>
    </div>
    <h3>Розподіл виконання між виконавцями</h3>
    ${executors.length ? `<div class="stats-bars">${bars}</div>` : "<p>За обраний період виконаних заявок не зафіксовано.</p>"}
  `;
};

const refresh = () => {
  const tickets = syncTickets();
  renderTicketList(tickets);
  if (tickets.length > lastTicketCount) playBeep();
  lastTicketCount = tickets.length;
};

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = new FormData(passwordForm).get("password");
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(PASSWORD_KEY, "true");
    passwordError.hidden = true;
    hidePasswordOverlay();
  } else {
    passwordError.hidden = false;
  }
});

if (goHomeButton) {
  goHomeButton.addEventListener("click", () => {
    window.location.href = "../";
  });
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "Вимкнути звук" : "Увімкнути звук";
  if (soundEnabled) playBeep();
});

statsToggle.addEventListener("click", () => {
  statsModal.hidden = false;
  renderStats();
});
closeStatsButton.addEventListener("click", () => {
  statsModal.hidden = true;
});
statsPeriod.addEventListener("change", renderStats);

filterAllButton.addEventListener("click", () => {
  activeFilter = "all";
  setActiveFilterButton();
  refresh();
});

filterQueuedButton.addEventListener("click", () => {
  activeFilter = "queued";
  setActiveFilterButton();
  refresh();
});

filterCompletedButton.addEventListener("click", () => {
  activeFilter = "completed";
  setActiveFilterButton();
  refresh();
});

if (ticketSearch) {
  ticketSearch.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    refresh();
  });
}

editForm.status.addEventListener("change", (event) => {
  toggleDoneFields(event.target.value);
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(editForm).entries());
  const tickets = syncTickets();
  const index = tickets.findIndex((ticket) => ticket.id === data.id);
  if (index === -1) return;

  if (data.status === "виконано" && !data.executor) {
    alert("Для завершення потрібен виконавець.");
    return;
  }

  tickets[index] = {
    ...tickets[index],
    fullName: data.fullName,
    serviceNumber: data.serviceNumber,
    category: data.category,
    description: data.description,
    status: data.status,
    executor: data.status === "виконано" ? data.executor : null,
    completionDate: data.status === "виконано" ? tickets[index].completionDate || new Date().toISOString() : null,
    isOverdue: false,
  };

  saveTickets(applyQueueRules(tickets));
  refresh();
  editorDrawer.hidden = true;
});

ticketList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  const tickets = syncTickets();
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) return;

  if (action === "edit") {
    populateForm(ticket);
    editorDrawer.hidden = false;
    return;
  }

  if (action === "delete") {
    if (!window.confirm("Видалити цю заявку?")) return;
    saveTickets(tickets.filter((item) => item.id !== id));
    refresh();
  }
});

closeEditorButton.addEventListener("click", () => {
  editorDrawer.hidden = true;
});

ensureAuth();
editorDrawer.hidden = true;
statsModal.hidden = true;
setActiveFilterButton();
refresh();
setInterval(refresh, 4000);
