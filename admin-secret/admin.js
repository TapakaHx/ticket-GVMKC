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

let lastTicketCount = 0;
let soundEnabled = false;
let audioContext;

const getTickets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTickets = (tickets) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

const formatStatus = (status) => (status === "in progress" ? "in progress" : status);

const renderTicketList = (tickets) => {
  if (tickets.length === 0) {
    ticketList.innerHTML = "<p>Наразі заявок немає.</p>";
    return;
  }
  ticketList.innerHTML = tickets
    .map(
      (ticket) => `
      <button class="ticket-card" type="button" data-id="${ticket.id}">
        <h3>№${ticket.queueNumber} · ${ticket.fullName}</h3>
        <div class="ticket-meta">
          <span>Статус: ${formatStatus(ticket.status)}</span>
          <span>Категорія: ${ticket.category}</span>
        </div>
        <p>${ticket.description}</p>
      </button>
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
  editForm.completionDate.value = ticket.completionDate ? ticket.completionDate.slice(0, 10) : "";
  toggleDoneFields(ticket.status);
};

const toggleDoneFields = (status) => {
  if (status === "done") {
    doneFields.hidden = false;
  } else {
    doneFields.hidden = true;
    editForm.executor.value = "";
    editForm.completionDate.value = "";
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
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.15;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  setTimeout(() => {
    oscillator.stop();
  }, 200);
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

  if (data.status === "done") {
    if (!data.executor || !data.completionDate) {
      alert("Для завершення потрібні виконавець і дата завершення.");
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
    executor: data.status === "done" ? data.executor : null,
    completionDate: data.status === "done" ? new Date(data.completionDate).toISOString() : null,
  };

  saveTickets(tickets);
  renderTicketList(tickets);
  populateForm(tickets[index]);
});

ticketList.addEventListener("click", (event) => {
  const target = event.target.closest(".ticket-card");
  if (!target) return;
  const id = target.dataset.id;
  const ticket = getTickets().find((item) => item.id === id);
  if (ticket) {
    populateForm(ticket);
  }
});

ensureAuth();
const initialTickets = getTickets();
lastTicketCount = initialTickets.length;
renderTicketList(initialTickets);
if (initialTickets[0]) {
  populateForm(initialTickets[0]);
}
setInterval(pollTickets, 4000);
