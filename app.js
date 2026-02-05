const ticketForm = document.getElementById("ticket-form");
const confirmation = document.getElementById("confirmation");
const adminLoginButton = document.getElementById("admin-login");
const submitPanel = document.getElementById("submit-panel");
const lookupPanel = document.getElementById("lookup-panel");
const openSubmitButton = document.getElementById("open-submit");
const openLookupButton = document.getElementById("open-lookup");
const publicQueue = document.getElementById("public-queue");

const STORAGE_KEY = "greensupport.tickets";
const QUEUE_KEY = "greensupport.queue";
const PASSWORD_KEY = "greensupport.admin.auth";
const ADMIN_PASSWORD = "X123456x";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
    // ignore
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
    Ваша заявка під номером: <strong>${ticket.queueNumber}</strong><br />
    Для перевірки використовуйте список заявок за останні 7 днів.
  `;
};

const renderPublicQueue = () => {
  const now = Date.now();
  const weeklyTickets = getTickets()
    .filter((ticket) => now - new Date(ticket.submissionDate).getTime() <= WEEK_MS)
    .sort((a, b) => a.queueNumber - b.queueNumber);

  if (weeklyTickets.length === 0) {
    publicQueue.innerHTML = "<p>За останні 7 днів заявок не зареєстровано.</p>";
    return;
  }

  publicQueue.innerHTML = weeklyTickets
    .map(
      (ticket) => `
      <article class="queue-card">
        <h3>Заявка №${ticket.queueNumber}</h3>
        <p><strong>Статус:</strong> ${ticket.status}</p>
        <p><strong>Категорія:</strong> ${ticket.category}</p>
        <p><strong>Подано:</strong> ${formatDate(ticket.submissionDate)}</p>
      </article>
    `
    )
    .join("");
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
  renderPublicQueue();
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
  if (panelToShow === "lookup") {
    renderPublicQueue();
  }
};

if (openSubmitButton) {
  openSubmitButton.addEventListener("click", () => showPanel("submit"));
}

if (openLookupButton) {
  openLookupButton.addEventListener("click", () => showPanel("lookup"));
}
