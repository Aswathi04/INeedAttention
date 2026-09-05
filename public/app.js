// Phase 2: personality-aware conversation with memory (Master Doc Section 6, Tech Spec Section 3).
// Still no lamp screen, timer, or TTS yet — those are Phase 3/4.

import { getPersonalityPrompt } from "./personalities.js";

const appState = {
  currentObject: null,       // { label: string, personalityPrompt: string }
  conversationHistory: [],   // [{ role: "object" | "user", text: string }]
};

const video = document.getElementById("camera");
const conversationLog = document.getElementById("conversationLog");
const currentObjectEl = document.getElementById("currentObject");
const replyForm = document.getElementById("replyForm");
const replyInput = document.getElementById("replyInput");

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
startCamera();

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

// --- Opening line: point at a new object, reset conversation ---
document.getElementById("captureBtn").addEventListener("click", async () => {
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

// --- Follow-up turns: text replies to the current object ---
replyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
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