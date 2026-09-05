const video = document.getElementById("camera");

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // rear camera — critical, test this on the demo phone
    });
    video.srcObject = stream;
  } catch (err) {
    document.getElementById("output").textContent =
      "Camera access needed to see objects — please allow and reload.";
    console.error(err);
  }
}

startCamera();

function captureFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.7).split(",")[1]; // strip data-uri prefix
}

document.getElementById("captureBtn").addEventListener("click", async () => {
  const frame = captureFrame();
  const output = document.getElementById("output");
  output.textContent = "Asking the object...";

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: frame }),
    });
    const data = await res.json();

    if (data.success) {
      output.textContent = data.responseText;
    } else {
      output.textContent = data.message; // graceful fallback, never a raw error
    }
  } catch (err) {
    output.textContent = "The object seems to be ignoring you right now.";
    console.error(err);
  }
});
