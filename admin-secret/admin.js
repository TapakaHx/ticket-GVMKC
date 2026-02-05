const STORAGE_KEY = "greensupport.tickets";
const PASSWORD_KEY = "greensupport.admin.auth";
const ADMIN_PASSWORD = "X123456x";

const ticketList = document.getElementById("ticket-list");
const editForm = document.getElementById("edit-form");
const doneFields = document.getElementById("done-fields");
const passwordOverlay = document.getElementById("password-overlay");
const passwordForm = document.getElementById("password-form");
const passwordError = document.getElementById("password-error");
const soundToggle = document.getElementById("sound-toggle");
const editorDrawer = document.getElementById("editor-drawer");
const closeEditorButton = document.getElementById("close-editor");

let lastTicketCount = 0;
let soundEnabled = false;
let audioContext;

const getTickets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTickets = (tickets) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

const formatStatus = (status) => status;
const formatDateTime = (value) =>
  new Date(value).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

const renderTicketList = (tickets) => {
  if (tickets.length === 0) {
    ticketList.innerHTML = "<p>Наразі заявок немає.</p>";
    return;
  }
  ticketList.innerHTML = tickets
    .map(
      (ticket) => `
      <div class="ticket-card" data-id="${ticket.id}">
        <h3>№${ticket.queueNumber} · ${ticket.fullName}</h3>
        <div class="ticket-meta">
          <span>Статус заявки: ${formatStatus(ticket.status)}</span>
          <span>Категорія проблеми: ${ticket.category}</span>
        </div>
        <div class="ticket-meta">
          <span>Подача: ${formatDateTime(ticket.submissionDate)}</span>
        </div>
        <p>${ticket.description}</p>
        <div class="ticket-actions">
          <button class="secondary" type="button" data-action="edit" data-id="${ticket.id}">
            Редагувати
          </button>
          <button class="secondary" type="button" data-action="delete" data-id="${ticket.id}">
            Видалити
          </button>
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
  setTimeout(() => {
    oscillator.stop();
  }, 260);
};

const pollTickets = () => {
  const tickets = getTickets();
  renderTicketList(tickets);
  if (tickets.length > lastTicketCount) {
    playBeep();
  }
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

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "Вимкнути звук" : "Увімкнути звук";
  if (soundEnabled) {
    playBeep();
  }
});

editForm.status.addEventListener("change", (event) => {
  toggleDoneFields(event.target.value);
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(editForm);
  const data = Object.fromEntries(formData.entries());
  const tickets = getTickets();
  const index = tickets.findIndex((ticket) => ticket.id === data.id);
  if (index === -1) return;

  if (data.status === "виконано") {
    if (!data.executor) {
      alert("Для завершення потрібен виконавець.");
      return;
    }
  }

  tickets[index] = {
    ...tickets[index],
    fullName: data.fullName,
    serviceNumber: data.serviceNumber,
    category: data.category,
    description: data.description,
    status: data.status,
    executor: data.status === "виконано" ? data.executor : null,
    completionDate:
      data.status === "виконано" ? tickets[index].completionDate || new Date().toISOString() : null,
  };

  saveTickets(tickets);
  renderTicketList(tickets);
  hideEditor();
});

const showEditor = () => {
  editorDrawer.hidden = false;
};

const hideEditor = () => {
  editorDrawer.hidden = true;
};

ticketList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;
  const tickets = getTickets();
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) return;
  if (action === "edit") {
    populateForm(ticket);
    showEditor();
    return;
  }
  if (action === "delete") {
    const confirmed = window.confirm("Видалити цю заявку?");
    if (!confirmed) return;
    const updated = tickets.filter((item) => item.id !== id);
    saveTickets(updated);
    renderTicketList(updated);
  }
});

if (closeEditorButton) {
  closeEditorButton.addEventListener("click", hideEditor);
}

ensureAuth();
const initialTickets = getTickets();
lastTicketCount = initialTickets.length;
renderTicketList(initialTickets);
setInterval(pollTickets, 4000);
