// Phase 3: lamp gate + timer (Master Doc Section 6, Tech Spec Sections 8 & 10).
// Screens: "lamp" -> "unlocking" -> "camera"/"conversation" -> back to "lamp" on expiry.

import { getPersonalityPrompt } from "./personalities.js";

const appState = {
  screen: "lamp",
  swipeCount: 0,
  powerActive: false,
  timerEndsAt: null,
  currentObject: null,
  conversationHistory: [],
};

// --- Element refs ---
const lampScreen = document.getElementById("lampScreen");
const unlockScreen = document.getElementById("unlockScreen");
const mainScreen = document.getElementById("mainScreen");
const lamp = document.getElementById("lamp");
const swipeCountEl = document.getElementById("swipeCount");
const timerDisplay = document.getElementById("timerDisplay");

const video = document.getElementById("camera");
const conversationLog = document.getElementById("conversationLog");
const currentObjectEl = document.getElementById("currentObject");
const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");

let timerInterval = null;

// --- Hardcoded farewell lines (Tech Spec Section 8) - no API call, must fire instantly ---
const farewellLines = [
  "Poof. Your three minutes are up, genie. The objects have gone back to ignoring you.",
  "Time's up! The furniture has nothing more to say to you. For now.",
  "And... you're just a regular human again. The bench doesn't even remember your name.",
];

// ===================== SCREEN 1: Lamp (swipe/tap to unlock) =====================

let touchStartX = 0;

lamp.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
});

lamp.addEventListener("touchend", (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  if (Math.abs(touchEndX - touchStartX) > 50) {
    registerSwipe();
  }
});

// Fallback: plain click/tap also counts, per Tech Spec Section 10 (swipe can be flaky on demo day)
lamp.addEventListener("click", registerSwipe);

function registerSwipe() {
  appState.swipeCount++;
  swipeCountEl.textContent = `Swipes: ${appState.swipeCount} / 3`;
  if (appState.swipeCount >= 3) {
    unlockPowers();
  }
}

// ===================== SCREEN 2: Unlock message, then start timer =====================

function unlockPowers() {
  lampScreen.hidden = true;
  unlockScreen.hidden = false;
  appState.screen = "unlocking";

  setTimeout(() => {
    unlockScreen.hidden = true;
    mainScreen.hidden = false;
    appState.screen = "camera";
    appState.powerActive = true;
    appState.timerEndsAt = Date.now() + 3 * 60 * 1000;
    startCamera();
    startTimerDisplay();
  }, 2000);
}

// ===================== Timer (Tech Spec Section 8) =====================

function checkPowerStatus() {
  if (!appState.powerActive) return "inactive";
  if (Date.now() >= appState.timerEndsAt) {
    appState.powerActive = false;
    return "expired";
  }
  return "active";
}

function startTimerDisplay() {
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  const remainingMs = Math.max(0, appState.timerEndsAt - Date.now());
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

  if (remainingMs <= 0) {
    clearInterval(timerInterval);
  }
}

// Call this BEFORE any action that would otherwise call the API.
// Returns true if the action should proceed, false if it was blocked by expiry.
function guardAgainstExpiry() {
  const status = checkPowerStatus();
  if (status === "expired") {
    handleExpiry();
    return false;
  }
  return true;
}

function handleExpiry() {
  clearInterval(timerInterval);
  const line = farewellLines[Math.floor(Math.random() * farewellLines.length)];
  addLogLine("object", line);

  // Brief pause so the farewell is readable, then reset to lamp screen.
  setTimeout(() => {
    resetToLampScreen();
  }, 2500);
}

function resetToLampScreen() {
  appState.screen = "lamp";
  appState.swipeCount = 0;
  appState.powerActive = false;
  appState.timerEndsAt = null;
  appState.currentObject = null;
  appState.conversationHistory = [];

  swipeCountEl.textContent = "Swipes: 0 / 3";
  conversationLog.innerHTML = "";
  currentObjectEl.textContent = "";

  mainScreen.hidden = true;
  lampScreen.hidden = false;

  const stream = video.srcObject;
  if (stream) stream.getTracks().forEach((track) => track.stop());
}

// ===================== SCREEN 3: Camera + conversation (Phase 2 logic) =====================

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;
  } catch (err) {
    addLogLine("system", "Camera access needed to see objects — please allow and reload.");
    console.error(err);
  }
}

function captureFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
}

function addLogLine(role, text) {
  const line = document.createElement("p");
  line.textContent = `${role === "user" ? "You" : role === "object" ? "Object" : ""}: ${text}`;
  conversationLog.appendChild(line);
}

document.getElementById("captureBtn").addEventListener("click", async () => {
  if (!guardAgainstExpiry()) return;

  const frame = captureFrame();
  conversationLog.innerHTML = "";
  appState.conversationHistory = [];
  currentObjectEl.textContent = "Asking the object...";

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: frame, conversationHistory: [] }),
    });
    const data = await res.json();

    if (data.success) {
      appState.currentObject = {
        label: data.objectLabel,
        personalityPrompt: getPersonalityPrompt(data.objectLabel),
      };
      currentObjectEl.textContent = `Talking to: ${data.objectLabel}`;
      appState.conversationHistory.push({ role: "object", text: data.responseText });
      addLogLine("object", data.responseText);
    } else {
      currentObjectEl.textContent = "";
      addLogLine("system", data.message);
    }
  } catch (err) {
    currentObjectEl.textContent = "";
    addLogLine("system", "...the object seems to be ignoring you. Try again?");
    console.error(err);
  }
});

replyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!guardAgainstExpiry()) return;

  const userMessage = replyInput.value.trim();
  if (!userMessage) return;
  if (!appState.currentObject) {
    addLogLine("system", "Point at an object first.");
    return;
  }

  replyInput.value = "";
  addLogLine("user", userMessage);

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalityPrompt: appState.currentObject.personalityPrompt,
        conversationHistory: appState.conversationHistory,
        userMessage,
      }),
    });
    const data = await res.json();

    if (data.success) {
      appState.conversationHistory.push({ role: "user", text: userMessage });
      appState.conversationHistory.push({ role: "object", text: data.responseText });
      addLogLine("object", data.responseText);
    } else {
      addLogLine("system", data.message);
    }
  } catch (err) {
    addLogLine("system", "...the object seems to be ignoring you. Try again?");
    console.error(err);
  }
});