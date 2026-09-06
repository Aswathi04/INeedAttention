// app.js — Genie Lamp frontend
import { personalityMap, personalityAccents, eyeStyles } from "./personalities.js";
import { createEyeRig } from "./eyeRig.js";

const POWER_DURATION_MS = 3 * 60 * 1000; // 3 minutes (intentional deviation from 5, user-requested)

const appState = {
  screen: "lamp",
  swipeCount: 0,
  powerActive: false,
  timerEndsAt: null,
  currentObject: null, // { label, personalityKey }
  conversationHistory: [],
  timerInterval: null,
};

const farewellLines = [
  "Poof. The room stops talking. It was fun while it lasted.",
  "Time's up — the walls have said all they're saying today.",
  "And just like that, you're back to being ignored by inanimate objects.",
];

// ---- DOM refs ----
const screens = {
  lamp: document.getElementById("screen-lamp"),
  unlocking: document.getElementById("screen-unlocking"),
  camera: document.getElementById("screen-camera"),
};
const lampFigure = document.getElementById("lamp-figure");
const swipeDots = [...document.querySelectorAll(".swipe-dot")];
const tapFallback = document.getElementById("tap-fallback");
const video = document.getElementById("camera-video");
const hudTimer = document.getElementById("hud-timer");
const hudObject = document.getElementById("hud-object");
const captureBtn = document.getElementById("capture-btn");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const farewellOverlay = document.getElementById("farewell-overlay");
const farewellText = document.getElementById("farewell-text");
const captureHint = document.getElementById("capture-hint");

// ---- Screen transitions ----
function showScreen(name) {
  appState.screen = name;
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("screen--active", key === name);
  });
}

// ---- Lamp unlock (swipe OR tap, 3x either way) ----
let touchStartX = 0;

function registerUnlockProgress() {
  appState.swipeCount++;
  lampFigure.classList.add("lamp-figure--shake");
  setTimeout(() => lampFigure.classList.remove("lamp-figure--shake"), 350);

  swipeDots.forEach((dot, i) => {
    dot.classList.toggle("swipe-dot--lit", i < appState.swipeCount);
  });

  if (appState.swipeCount >= 3) {
    unlockPowers();
  }
}

lampFigure.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
});

lampFigure.addEventListener("touchend", (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  if (Math.abs(touchEndX - touchStartX) > 50) {
    registerUnlockProgress();
  }
});

tapFallback.addEventListener("click", registerUnlockProgress);

async function unlockPowers() {
  showScreen("unlocking");
  appState.powerActive = true;
  appState.timerEndsAt = Date.now() + POWER_DURATION_MS;

  captureBtn.classList.add("capture-btn--pulsing");
  captureHint?.classList.remove("capture-hint--hidden");

  setTimeout(async () => {
    showScreen("camera");
    startTimerDisplay();
    await startCamera();
  }, 2000);
}

// ---- Timer ----
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startTimerDisplay() {
  clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(() => {
    const remaining = appState.timerEndsAt - Date.now();
    hudTimer.textContent = formatTime(remaining);
    hudTimer.classList.toggle("hud-timer--urgent", remaining <= 30000 && remaining > 0);
    if (remaining <= 0) {
      clearInterval(appState.timerInterval);
      expirePowers();
    }
  }, 250);
}

function checkPowerStatus() {
  if (!appState.powerActive) return "inactive";
  if (Date.now() >= appState.timerEndsAt) {
    appState.powerActive = false;
    return "expired";
  }
  return "active";
}

function expirePowers() {
  appState.powerActive = false;
  removeEyeRig(); // stop any active eye animation before the farewell overlay covers the screen
  const line = farewellLines[Math.floor(Math.random() * farewellLines.length)];
  speak(line);
  farewellText.textContent = line;
  farewellOverlay.classList.add("farewell-overlay--visible");

  stopCamera();

  setTimeout(() => {
    farewellOverlay.classList.remove("farewell-overlay--visible");
    resetToLampScreen();
  }, 4000);
}

function resetToLampScreen() {
  appState.swipeCount = 0;
  appState.currentObject = null;
  appState.conversationHistory = [];
  removeEyeRig();
  swipeDots.forEach((dot) => dot.classList.remove("swipe-dot--lit"));
  chatLog.innerHTML = "";
  chatInput.value = "";
  chatInput.disabled = true;
  chatSend.disabled = true;
  hudObject.textContent = "point at something";
  showScreen("lamp");
}

// ---- Camera ----
let mediaStream = null;

async function startCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = mediaStream;
  } catch (err) {
    console.error("Camera error:", err);
    addSystemLine("Camera access needed to see objects — please allow and reload.");
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}

function captureFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
}

// ---- Chat log rendering ----
function addBubble(role, text, accentColor) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble--${role}`;
  if (accentColor) bubble.style.setProperty("--bubble-accent", accentColor);
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

function addSystemLine(text) {
  addBubble("system", text);
}

function addObjectLine(text) {
  const accent = appState.currentObject
    ? personalityAccents[appState.currentObject.personalityKey]
    : undefined;
  addBubble("object", text, accent);
  speak(text);
}

function addUserLine(text) {
  addBubble("user", text);
}

// ---- TTS (now tied to the eye rig's mouth while it's active) ----
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (currentEyeRig) {
    utterance.onstart = () => currentEyeRig?.startTalking();
    utterance.onend = () => currentEyeRig?.stopTalking();
    utterance.onerror = () => currentEyeRig?.stopTalking();
  }

  window.speechSynthesis.speak(utterance);
}

// ---- Eye rig (Phase 5 polish — the animated "it's alive" eyes) ----
const cameraFrameEl = document.getElementById("camera-frame");
let currentEyeRig = null;

function removeEyeRig() {
  if (currentEyeRig) {
    currentEyeRig.destroy();
    currentEyeRig = null;
  }
}

async function spawnEyeRig(personalityKey, eyePosition) {
  removeEyeRig(); // only one object's eyes on screen at a time

  if (!eyePosition || !cameraFrameEl) return; // no coordinates from Gemini this turn — skip silently

  const style = eyeStyles[personalityKey] || eyeStyles.gremlin;
  const screenX = eyePosition.x * cameraFrameEl.clientWidth;
  const screenY = eyePosition.y * cameraFrameEl.clientHeight;

  currentEyeRig = createEyeRig(cameraFrameEl, style, screenX, screenY);
  await currentEyeRig.wakeUp();
  currentEyeRig?.startIdlePersonality();
}

// ---- API calls ----
async function callGemini(payload) {
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error("Network error calling /api/gemini:", err);
    return { success: false, error: "gemini_timeout", message: "The object seems to be ignoring you right now." };
  }
}

// Opening capture: the API infers object + in-character reply in one Gemini
// call (it doesn't know the personality yet), then we map label -> personality
// on the client for all follow-up turns.
async function identifyObjectWithPersonality() {
  if (checkPowerStatus() === "expired") {
    expirePowers();
    return;
  }
  captureBtn.disabled = true;
  addSystemLine("Asking the object...");

  const imageBase64 = captureFrame();
  // We don't know the personality until Gemini identifies the object, so the
  // opening call sends no personalityKey — the API infers object + reply in
  // one shot, then we map label -> personality on the client for follow-ups.
  const result = await callGemini({ imageBase64 });

  const lastSystem = [...chatLog.querySelectorAll(".chat-bubble--system")].pop();
  if (lastSystem) lastSystem.remove();
  captureBtn.disabled = false;

  if (!result.success) {
    const fallbackLabel = appState.currentObject?.label || "object";
    addSystemLine(result.message || `The ${fallbackLabel} seems to be ignoring you right now.`);
    return;
  }

  const label = (result.objectLabel || "thing").toLowerCase().trim();
  const personalityKey = personalityMap[label] || personalityMap.default;

  appState.currentObject = { label, personalityKey };
  appState.conversationHistory = [{ role: "object", text: result.responseText }];

  hudObject.textContent = label;
  chatInput.disabled = false;
  chatSend.disabled = false;

  await spawnEyeRig(personalityKey, result.eyePosition);
  addObjectLine(result.responseText);
}

captureBtn.addEventListener("click", () => {
  captureBtn.classList.remove("capture-btn--pulsing");
  captureHint?.classList.add("capture-hint--hidden");
  identifyObjectWithPersonality();
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message || !appState.currentObject) return;

  if (checkPowerStatus() === "expired") {
    expirePowers();
    return;
  }

  chatInput.value = "";
  addUserLine(message);
  appState.conversationHistory.push({ role: "user", text: message });

  chatSend.disabled = true;

  const result = await callGemini({
    personalityKey: appState.currentObject.personalityKey,
    objectLabel: appState.currentObject.label,
    conversationHistory: appState.conversationHistory,
    userMessage: message,
  });

  chatSend.disabled = false;

  if (!result.success) {
    addSystemLine(result.message || `The ${appState.currentObject.label} seems to be ignoring you right now.`);
    return;
  }

  appState.conversationHistory.push({ role: "object", text: result.responseText });
  addObjectLine(result.responseText);
});
