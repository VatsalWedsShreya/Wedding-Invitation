/*
 * Before publishing:
 * 1. Deploy Code.gs as a Google Apps Script web app.
 * 2. Paste its /exec URL below.
 */
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbw91Z-h71xpszBVWseEIZdo_U8p6m6K_OrqjFlwF867eZJmlma-ggGAEtrILCux2ehgOA/exec";

const $ = (id) => document.getElementById(id);

// Invitation opening
const openButton = $("openInvite");
const cover = $("cover");
const invitation = $("invitation");
openButton.addEventListener("click", () => {
  cover.classList.add("is-hidden");
  invitation.classList.add("is-open");
  invitation.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "auto";
  window.setTimeout(() => $("home").scrollIntoView({ behavior: "smooth" }), 150);
});

// Countdown to the first celebration: 25 December 2026, 3:00 PM IST.
const weddingStart = new Date("2026-12-25T15:00:00+05:30").getTime();
function updateCountdown() {
  const distance = weddingStart - Date.now();
  if (distance <= 0) {
    $("days").textContent = "00";
    $("hours").textContent = "00";
    $("minutes").textContent = "00";
    $("seconds").textContent = "00";
    return;
  }
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);
  $("days").textContent = String(days).padStart(2, "0");
  $("hours").textContent = String(hours).padStart(2, "0");
  $("minutes").textContent = String(minutes).padStart(2, "0");
  $("seconds").textContent = String(seconds).padStart(2, "0");
}
updateCountdown();
window.setInterval(updateCountdown, 1000);

// Declining guests do not need to choose guest count or ceremonies.
const attendanceDetails = $("attendanceDetails");
document.querySelectorAll('input[name="attending"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const accepted = document.querySelector('input[name="attending"]:checked').value === "Yes";
    attendanceDetails.classList.toggle("attendance-hidden", !accepted);
  });
});

// The form is posted to a hidden iframe. This avoids exposing credentials and
// avoids browser CORS restrictions when sending a static-site form to Apps Script.
const form = $("rsvpForm");
const frame = $("rsvpFrame");
const submitButton = $("submitRsvp");
const formStatus = $("formStatus");
let submitTimeout;
let requestInProgress = false;

function setStatus(message, type) {
  formStatus.textContent = message;
  formStatus.classList.remove("success", "error");
  if (type) formStatus.classList.add(type);
}

window.addEventListener("message", (event) => {
  if (event.source !== frame.contentWindow) return;
  if (event.data === "rsvp-saved") {
    window.clearTimeout(submitTimeout);
    requestInProgress = false;
    submitButton.disabled = false;
    submitButton.textContent = "RSVP received — thank you ♥";
    setStatus("Thank you! Your RSVP has been recorded. We can’t wait to celebrate with you.", "success");
  } else if (event.data === "rsvp-error") {
    window.clearTimeout(submitTimeout);
    requestInProgress = false;
    submitButton.disabled = false;
    setStatus("We couldn’t save your response. Please try again or contact the hosts.", "error");
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (requestInProgress) return;

  if (!RSVP_ENDPOINT.startsWith("https://script.google.com/") || !RSVP_ENDPOINT.includes("/macros/s/") || !RSVP_ENDPOINT.endsWith("/exec") || RSVP_ENDPOINT.includes("PASTE_")) {
    setStatus("The RSVP sheet is not connected yet. Complete the Google Sheets setup in the README first.", "error");
    return;
  }

  const name = $("guestName").value.trim();
  const phone = $("guestPhone").value.trim();
  const email = $("guestEmail").value.trim();
  const attending = document.querySelector('input[name="attending"]:checked').value;
  const accepted = attending === "Yes";
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name || !phone || phoneDigits.length < 7 || phoneDigits.length > 15) {
    setStatus("Please enter your name and a valid phone / WhatsApp number.", "error");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus("Please check the email address or leave it blank.", "error");
    return;
  }

  const events = accepted
    ? Array.from(document.querySelectorAll('input[name="event"]:checked')).map((input) => input.value)
    : [];

  const payload = {
    name,
    phone,
    email,
    attending,
    guestCount: accepted ? Number($("guestCount").value) : 0,
    events,
    song: $("songRequest").value.trim(),
    message: $("guestMessage").value.trim(),
    website: $("website").value.trim()
  };

  $("payload").value = JSON.stringify(payload);
  form.action = RSVP_ENDPOINT;
  requestInProgress = true;
  submitButton.disabled = true;
  setStatus("Sending your RSVP securely to the hosts’ response sheet…");

  // Submit through the native browser form target (hidden iframe).
  HTMLFormElement.prototype.submit.call(form);

  submitTimeout = window.setTimeout(() => {
    if (!requestInProgress) return;
    requestInProgress = false;
    submitButton.disabled = false;
    setStatus("We haven’t received a confirmation yet. Please check your connection and try again, or contact the hosts.", "error");
  }, 20000);
});
