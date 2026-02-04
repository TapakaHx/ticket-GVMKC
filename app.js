const ticketForm = document.getElementById("ticket-form");
const confirmation = document.getElementById("confirmation");
const tokenForm = document.getElementById("token-form");
const ticketDetails = document.getElementById("ticket-details");

const STORAGE_KEY = "greensupport.tickets";
const QUEUE_KEY = "greensupport.queue";

const getTickets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTickets = (tickets) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
const getNextQueueNumber = () => {
  const current = Number(localStorage.getItem(QUEUE_KEY) || "0");
  const next = current + 1;
  localStorage.setItem(QUEUE_KEY, String(next));
  return next;
};

const formatDate = (value) => new Date(value).toLocaleString("uk-UA");

const createTicket = (data) => ({
  id: crypto.randomUUID(),
  token: crypto.randomUUID().split("-")[0].toUpperCase(),
  queueNumber: getNextQueueNumber(),
  status: "queue",
  submissionDate: new Date().toISOString(),
  completionDate: null,
  executor: null,
  ...data,
});

const renderConfirmation = (ticket) => {
  confirmation.hidden = false;
  confirmation.innerHTML = `
    <strong>Заявку прийнято!</strong><br />
    Ваш номер черги: <strong>${ticket.queueNumber}</strong><br />
    Токен для керування заявкою: <strong>${ticket.token}</strong>
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
        <strong>Категорія</strong>
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
    <div class="ticket-actions">
      ${
        ticket.status === "queue"
          ? `<button class="secondary" data-action="delete" data-id="${ticket.id}">Видалити</button>`
          : ""
      }
    </div>
  `;
};

const showTicketNotFound = () => {
  ticketDetails.hidden = false;
  ticketDetails.innerHTML = `
    <header><h3>Заявку не знайдено</h3></header>
    <p>Перевірте токен або зверніться до адміністратора.</p>
  `;
};

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(ticketForm);
  const data = Object.fromEntries(formData.entries());
  const ticket = createTicket(data);
  const tickets = getTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  ticketForm.reset();
  renderConfirmation(ticket);
});

tokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const token = new FormData(tokenForm).get("token").trim().toUpperCase();
  const tickets = getTickets();
  const ticket = tickets.find((item) => item.token === token);
  if (!ticket) {
    showTicketNotFound();
    return;
  }
  renderTicketDetails(ticket);
});

ticketDetails.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action === "delete") {
    const id = target.dataset.id;
    const tickets = getTickets();
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket || ticket.status !== "queue") return;
    const updated = tickets.filter((item) => item.id !== id);
    saveTickets(updated);
    ticketDetails.hidden = true;
    alert("Заявку видалено.");
  }
});
