"use strict";

/*
 * Each message is an object with:
 *   text       - the actual message text
 *   isSent     - true once the message has left the sender
 *   isReceived - true once it has reached the other person's device
 *   isRead     - true once the other person has opened/seen it
 *
 * The flags only ever move forward: sent -> received -> read.
 * Delivery is simulated with timers, since this demo has no server.
 */

const STORAGE_KEY = "simple-chat-messages-v1";
const ME = "me";
const FRIEND = "friend";

const SENT_DELAY_MS = 400;
const RECEIVED_DELAY_MS = 1200;
const READ_DELAY_MS = 2800;
const REPLY_DELAY_MS = 1500;

const CANNED_REPLIES = [
  "Got it, thanks!",
  "Sounds good to me.",
  "Interesting, tell me more.",
  "Haha, nice one.",
  "Can we talk about it later?"
];

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const clearBtn = document.getElementById("clear-btn");

let messages = load();

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createMessage(text, sender) {
  return {
    id: newId(),
    text: text,
    sender: sender,
    timestamp: Date.now(),
    isSent: false,
    isReceived: false,
    isRead: false
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (err) {
    /* storage unavailable: the chat still works for this session */
  }
}

function updateMessage(id, changes) {
  const msg = messages.find((m) => m.id === id);
  if (!msg) return;
  Object.assign(msg, changes);
  save();
  render();
}

/* Walk an outgoing message through sent -> received -> read. */
function simulateDelivery(msg) {
  if (!msg.isSent) setTimeout(() => updateMessage(msg.id, { isSent: true }), SENT_DELAY_MS);
  if (!msg.isReceived) setTimeout(() => updateMessage(msg.id, { isReceived: true }), RECEIVED_DELAY_MS);
  if (!msg.isRead) {
    setTimeout(() => {
      updateMessage(msg.id, { isRead: true });
      scheduleReply();
    }, READ_DELAY_MS);
  }
}

function scheduleReply() {
  setTimeout(() => {
    const text = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
    const reply = createMessage(text, FRIEND);
    // Incoming messages arrive already sent and received.
    reply.isSent = true;
    reply.isReceived = true;
    messages.push(reply);
    save();
    markIncomingAsRead();
    render();
  }, REPLY_DELAY_MS);
}

/* Messages from Sam count as read once this tab is visible to the user. */
function markIncomingAsRead() {
  if (document.visibilityState !== "visible") return;
  let changed = false;
  messages.forEach((m) => {
    if (m.sender === FRIEND && !m.isRead) {
      m.isRead = true;
      changed = true;
    }
  });
  if (changed) save();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusFor(msg) {
  if (msg.isRead) return { symbol: "\u2713\u2713", label: "Read", cls: "tick read" };
  if (msg.isReceived) return { symbol: "\u2713\u2713", label: "Received", cls: "tick" };
  if (msg.isSent) return { symbol: "\u2713", label: "Sent", cls: "tick" };
  return { symbol: "\u2026", label: "Sending", cls: "tick" };
}

function render() {
  messagesEl.textContent = "";

  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No messages yet. Say hello!";
    messagesEl.appendChild(empty);
    return;
  }

  messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + msg.sender;

    const text = document.createElement("p");
    text.className = "text";
    text.textContent = msg.text; // textContent keeps user input from being run as HTML
    bubble.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "meta";

    const time = document.createElement("span");
    time.textContent = formatTime(msg.timestamp);
    meta.appendChild(time);

    // Status flags are only shown on messages you sent.
    if (msg.sender === ME) {
      const status = statusFor(msg);
      const tick = document.createElement("span");
      tick.className = status.cls;
      tick.textContent = status.symbol;
      tick.title = status.label;
      tick.setAttribute("aria-label", status.label);
      meta.appendChild(tick);

      const label = document.createElement("span");
      label.textContent = status.label;
      meta.appendChild(label);
    }

    bubble.appendChild(meta);
    messagesEl.appendChild(bubble);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  const msg = createMessage(text, ME);
  messages.push(msg);
  save();
  render();
  inputEl.value = "";
  simulateDelivery(msg);
});

clearBtn.addEventListener("click", () => {
  messages = [];
  save();
  render();
});

document.addEventListener("visibilitychange", () => {
  markIncomingAsRead();
  render();
});

/* On page load, resume delivery for any of your messages that were not finished. */
markIncomingAsRead();
render();
messages
  .filter((m) => m.sender === ME && !m.isRead)
  .forEach(simulateDelivery);
