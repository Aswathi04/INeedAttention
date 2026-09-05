// eyeRig.js — the animated eyes that "wake up" on an identified object.
// One shared rig (markup + animation engine); personality differences come
// entirely from the style params in personalities.js's eyeStyles map.

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

const MOUTH_CLOSED_D = "M 62 78 Q 80 78 98 78";
const MOUTH_OPEN_D = "M 62 76 Q 80 92 98 76";

/**
 * Creates an eye rig positioned at (screenX, screenY) inside `container`
 * (container must be position: relative/absolute so child absolute
 * positioning is relative to it, not the viewport).
 *
 * Returns a handle with:
 *   wakeUp()              - one slow universal blink, resolves when done
 *   startIdlePersonality() - begins personality-flavored random blinking + pupil motion
 *   startTalking() / stopTalking() - mouth-pulse while TTS speaks
 *   closeAndHold()         - slow blink shut, stays shut (farewell)
 *   blinkOutAndRemove()    - quick close, then removes the DOM node; resolves when gone
 *   destroy()              - immediate removal, no animation (safety net)
 */
export function createEyeRig(container, style, screenX, screenY) {
  const wrap = document.createElement("div");
  wrap.className = "eye-rig";
  wrap.style.left = `${screenX}px`;
  wrap.style.top = `${screenY}px`;

  const svg = svgEl("svg", { viewBox: "0 0 160 100", class: "eye-rig-svg" });

  const spacing = style.spacing ?? 32;
  const cy = 42;
  const sides = [
    { side: "left", cx: 80 - spacing },
    { side: "right", cx: 80 + spacing },
  ];

  const pupils = [];
  const eyeBalls = [];

  sides.forEach(({ side, cx }) => {
    const mismatch = style.mismatched && side === "right" ? style.mismatchOffset || {} : {};
    const rx = style.rx + (mismatch.rx || 0);
    const ry = style.ry + (mismatch.ry || 0);
    const groupCy = cy + (mismatch.cy || 0);
    const browAngle = side === "left" ? style.browAngle : -style.browAngle;

    const eyeGroup = svgEl("g", { class: "eye-group", transform: `translate(${cx} ${groupCy})` });
    const eyeBall = svgEl("g", { class: "eye-ball" });
    const sclera = svgEl("ellipse", { class: "eye-sclera", cx: 0, cy: 0, rx, ry });
    const pupil = svgEl("circle", { class: "eye-pupil", cx: 0, cy: 0, r: style.pupilR });
    // Brows float over whatever the camera sees behind them — an unknown,
    // uncontrolled background — so each brow is drawn twice: a thicker light
    // "halo" line underneath, then the dark line on top. That keeps it
    // readable against a bright wall or a dark bench alike.
    const browGroup = svgEl("g", { transform: `rotate(${browAngle})` });
    const browLineCoords = { x1: -rx * 1.1, y1: -ry - style.browGap, x2: rx * 1.1, y2: -ry - style.browGap };
    const browHalo = svgEl("line", { class: "eye-brow-halo", ...browLineCoords });
    const brow = svgEl("line", { class: "eye-brow", ...browLineCoords });
    browGroup.appendChild(browHalo);
    browGroup.appendChild(brow);

    eyeBall.appendChild(sclera);
    eyeBall.appendChild(pupil);
    eyeGroup.appendChild(eyeBall);
    eyeGroup.appendChild(browGroup);
    svg.appendChild(eyeGroup);

    pupils.push(pupil);
    eyeBalls.push(eyeBall);
  });

  const mouthHalo = svgEl("path", { class: "eye-mouth-halo", d: MOUTH_CLOSED_D });
  const mouth = svgEl("path", { class: "eye-mouth", d: MOUTH_CLOSED_D });
  svg.appendChild(mouthHalo);
  svg.appendChild(mouth);
  wrap.appendChild(svg);
  container.appendChild(wrap);

  let blinkTimer = null;
  let motionTimer = null;
  let motionRaf = null;
  let mouthTimer = null;
  let destroyed = false;

  function setBlinkState(closed) {
    eyeBalls.forEach((ball) => ball.classList.toggle("eye-ball--closed", closed));
  }

  function doBlink(durationMs = 130) {
    return new Promise((resolve) => {
      if (destroyed) return resolve();
      setBlinkState(true);
      setTimeout(() => {
        if (destroyed) return resolve();
        setBlinkState(false);
        setTimeout(resolve, durationMs);
      }, durationMs);
    });
  }

  function scheduleIdleBlinks() {
    const [min, max] = style.blink;
    const next = min + Math.random() * (max - min);
    blinkTimer = setTimeout(async () => {
      if (destroyed) return;
      await doBlink();
      scheduleIdleBlinks();
    }, next);
  }

  function setPupilOffset(dx, dy) {
    pupils.forEach((pupil) => {
      pupil.setAttribute("transform", `translate(${dx} ${dy})`);
    });
  }

  function startDartMotion() {
    const jump = () => {
      if (destroyed) return;
      const dx = (Math.random() * 2 - 1) * style.amplitude;
      const dy = (Math.random() * 2 - 1) * style.amplitude * 0.6;
      setPupilOffset(dx, dy);
      motionTimer = setTimeout(jump, style.speed * (0.6 + Math.random() * 0.8));
    };
    jump();
  }

  function startDriftMotion() {
    const startTime = performance.now();
    const loop = (now) => {
      if (destroyed) return;
      const t = ((now - startTime) / style.speed) * Math.PI * 2;
      const dx = Math.sin(t) * style.amplitude;
      const dy = Math.sin(t * 0.6) * style.amplitude * 0.5;
      setPupilOffset(dx, dy);
      motionRaf = requestAnimationFrame(loop);
    };
    motionRaf = requestAnimationFrame(loop);
  }

  function stopMotion() {
    clearTimeout(motionTimer);
    if (motionRaf) cancelAnimationFrame(motionRaf);
    motionTimer = null;
    motionRaf = null;
  }

  return {
    async wakeUp() {
      await doBlink(220); // one slow, deliberate "waking up" blink — same for every personality
    },

    startIdlePersonality() {
      scheduleIdleBlinks();
      if (style.motion === "dart") startDartMotion();
      else startDriftMotion();
    },

    startTalking() {
      if (mouthTimer) return;
      let open = false;
      mouthTimer = setInterval(() => {
        if (destroyed) return;
        open = !open;
        const d = open ? MOUTH_OPEN_D : MOUTH_CLOSED_D;
        mouth.setAttribute("d", d);
        mouthHalo.setAttribute("d", d);
      }, 150);
    },

    stopTalking() {
      clearInterval(mouthTimer);
      mouthTimer = null;
      mouth.setAttribute("d", MOUTH_CLOSED_D);
      mouthHalo.setAttribute("d", MOUTH_CLOSED_D);
    },

    async closeAndHold() {
      clearTimeout(blinkTimer);
      stopMotion();
      await doBlink(400);
      setBlinkState(true); // stay shut, don't reopen
    },

    blinkOutAndRemove() {
      return new Promise((resolve) => {
        clearTimeout(blinkTimer);
        stopMotion();
        clearInterval(mouthTimer);
        setBlinkState(true);
        setTimeout(() => {
          destroyed = true;
          wrap.remove();
          resolve();
        }, 160);
      });
    },

    destroy() {
      destroyed = true;
      clearTimeout(blinkTimer);
      clearInterval(mouthTimer);
      stopMotion();
      wrap.remove();
    },
  };
}
