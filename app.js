const ticketForm = document.getElementById("ticket-form");
const confirmation = document.getElementById("confirmation");
const tokenForm = document.getElementById("token-form");
const ticketDetails = document.getElementById("ticket-details");
const adminLoginButton = document.getElementById("admin-login");
const submitPanel = document.getElementById("submit-panel");
const lookupPanel = document.getElementById("lookup-panel");
const openSubmitButton = document.getElementById("open-submit");
const openLookupButton = document.getElementById("open-lookup");

const STORAGE_KEY = "greensupport.tickets";
const QUEUE_KEY = "greensupport.queue";
const PASSWORD_KEY = "greensupport.admin.auth";
const ADMIN_PASSWORD = "X123456x";

const getTickets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTickets = (tickets) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
const getNextQueueNumber = () => {
  const current = Number(localStorage.getItem(QUEUE_KEY) || "0");
  const next = current + 1;
  localStorage.setItem(QUEUE_KEY, String(next));
  return next;
};

const formatDate = (value) =>
  new Date(value).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

const getRequesterInfo = async () => {
  let requesterIp = "Невідомо";

  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      requesterIp = payload.ip || requesterIp;
    }
  } catch {
    // Ignore network issues; keep fallback value.
  }

  const requesterHost = window.location.hostname || "Невідомо";
  const requesterDevice = navigator.userAgentData?.platform || navigator.platform || "Невідомо";

  return { requesterIp, requesterHost, requesterDevice };
};

const createTicket = (data) => ({
  id: crypto.randomUUID(),
  queueNumber: getNextQueueNumber(),
  status: "в черзі",
  submissionDate: new Date().toISOString(),
  completionDate: null,
  executor: null,
  isOverdue: false,
  ...data,
});

const renderConfirmation = (ticket) => {
  confirmation.hidden = false;
  confirmation.innerHTML = `
    <strong>Заявку прийнято!</strong><br />
    Ваш номер черги: <strong>${ticket.queueNumber}</strong><br />
    Використовуйте номер черги для керування заявкою.
  `;
};

const renderTicketDetails = (ticket) => {
  ticketDetails.hidden = false;
  ticketDetails.innerHTML = `
    <header>
      <div>
        <h3>Заявка №${ticket.queueNumber}</h3>
        <p>${ticket.fullName} · ${ticket.serviceNumber}</p>
      </div>
      <span class="status-pill">${ticket.status}</span>
    </header>
    <div class="details-grid">
      <div>
        <strong>Категорія проблеми</strong>
        <p>${ticket.category}</p>
      </div>
      <div>
        <strong>Опис</strong>
        <p>${ticket.description}</p>
      </div>
      <div>
        <strong>Дата подачі</strong>
        <p>${formatDate(ticket.submissionDate)}</p>
      </div>
      ${
        ticket.completionDate
          ? `
      <div>
        <strong>Дата завершення</strong>
        <p>${formatDate(ticket.completionDate)}</p>
      </div>
      <div>
        <strong>Виконавець</strong>
        <p>${ticket.executor || "—"}</p>
      </div>`
          : ""
      }
    </div>
  `;
};

const showTicketNotFound = () => {
  ticketDetails.hidden = false;
  ticketDetails.innerHTML = `
    <header><h3>Заявку не знайдено</h3></header>
    <p>Перевірте номер черги або зверніться до адміністратора.</p>
  `;
};

ticketForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(ticketForm);
  const data = Object.fromEntries(formData.entries());
  const requesterInfo = await getRequesterInfo();
  const ticket = createTicket({ ...data, ...requesterInfo });
  const tickets = getTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  ticketForm.reset();
  renderConfirmation(ticket);
});

tokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const queueNumber = new FormData(tokenForm).get("queueNumber").trim();
  const tickets = getTickets();
  const ticket = tickets.find((item) => String(item.queueNumber) === queueNumber);
  if (!ticket) {
    showTicketNotFound();
    return;
  }
  renderTicketDetails(ticket);
});

if (adminLoginButton) {
  adminLoginButton.addEventListener("click", () => {
    const password = prompt("Введіть пароль адміністратора");
    if (!password) return;
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(PASSWORD_KEY, "true");
      window.location.href = "./admin-secret/";
    } else {
      alert("Невірний пароль.");
    }
  });
}

const showPanel = (panelToShow) => {
  if (submitPanel) submitPanel.hidden = panelToShow !== "submit";
  if (lookupPanel) lookupPanel.hidden = panelToShow !== "lookup";
};

if (openSubmitButton) {
  openSubmitButton.addEventListener("click", () => showPanel("submit"));
}

if (openLookupButton) {
  openLookupButton.addEventListener("click", () => showPanel("lookup"));
}
