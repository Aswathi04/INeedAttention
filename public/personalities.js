export const personalityMap = {
  bench: "clara",
  desk: "chandler",
  wall: "fleabag",
  "tube light": "clara",
  fan: "loki",
  curtain: "overeager",
  window: "diva",
  board: "nihilist",
  "lecture stand": "loki",
  projector: "clara",
  "waste basket": "nihilist",
  tree: "oogway",
  plant: "oogway",
  default: "gremlin",
};

export const personalityAccents = {
  clara: "#E3A83B",
  chandler: "#54D3C2",
  fleabag: "#C23B6C",
  loki: "#8B6BD8",
  oogway: "#7FBF8E",
  overeager: "#F6C868",
  diva: "#E37BA0",
  nihilist: "#8892A6",
  gremlin: "#54D3C2",
};

// Eye-rig parameters per personality — consumed by eyeRig.js.
// Kept in sync with api/personalities.js by hand (same duplication pattern as
// personalityMap/personalityPrompts — Vercel functions can't see outside /api,
// and this copy needs to live in /public so the browser can fetch it).
export const eyeStyles = {
  clara: {
    rx: 14, ry: 16, pupilR: 5, spacing: 30,
    browAngle: -15, browGap: 6,
    blink: [900, 1800], motion: "dart", amplitude: 4, speed: 350,
  },
  chandler: {
    rx: 15, ry: 13, pupilR: 5, spacing: 34,
    browAngle: -8, browGap: 8,
    blink: [2200, 4000], motion: "drift", amplitude: 2, speed: 2600,
  },
  fleabag: {
    rx: 14, ry: 11, pupilR: 5.5, spacing: 34,
    browAngle: -4, browGap: 7,
    blink: [3000, 5500], motion: "drift", amplitude: 1.5, speed: 3200,
  },
  loki: {
    rx: 13, ry: 11, pupilR: 4, spacing: 36,
    browAngle: -22, browGap: 5,
    blink: [3500, 6000], motion: "drift", amplitude: 3, speed: 2200,
  },
  oogway: {
    rx: 12, ry: 7, pupilR: 3, spacing: 34,
    browAngle: 0, browGap: 4,
    blink: [4500, 8000], motion: "drift", amplitude: 0.5, speed: 4000,
  },
  overeager: {
    rx: 16, ry: 16, pupilR: 6, spacing: 30,
    browAngle: 20, browGap: 9,
    blink: [600, 1200], motion: "dart", amplitude: 5, speed: 260,
  },
  diva: {
    rx: 14, ry: 11, pupilR: 4.5, spacing: 35,
    browAngle: -18, browGap: 9,
    blink: [2800, 4800], motion: "drift", amplitude: 2.5, speed: 3000,
  },
  nihilist: {
    rx: 13, ry: 8, pupilR: 4, spacing: 34,
    browAngle: 0, browGap: 4,
    blink: [5000, 9000], motion: "drift", amplitude: 0.3, speed: 5000,
  },
  gremlin: {
    rx: 13, ry: 13, pupilR: 5, spacing: 32,
    browAngle: 10, browGap: 6,
    blink: [400, 2200], motion: "dart", amplitude: 7, speed: 220,
    mismatched: true, mismatchOffset: { rx: 4, ry: -3, cy: -4 },
  },
};