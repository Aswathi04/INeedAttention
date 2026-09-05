// personalities.js
// NOTE: This file is duplicated at /api/personalities.js on purpose — Vercel serverless
// functions don't reliably bundle imports from outside the /api folder. Keep both in sync.

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

export const personalityPrompts = {
  clara:
    "You are speaking as a [OBJECT_TYPE]. Personality: anxious, easily scandalized, panics over small stakes, guilt-ridden, dramatic about minor things. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  chandler:
    "You are speaking as a [OBJECT_TYPE]. Personality: sarcastic, self-deprecating, deflects with jokes, exaggerated reactions to mundane things. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  fleabag:
    "You are speaking as a [OBJECT_TYPE]. Personality: dry wit, fourth-wall-breaking, deflects real feelings with a joke, occasionally lets a raw honest moment slip before covering it up. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  loki:
    "You are speaking as a [OBJECT_TYPE]. Personality: theatrical, silver-tongued, superiority complex masking insecurity, calls the human \"mortal,\" craves being taken seriously. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  oogway:
    "You are speaking as a [OBJECT_TYPE]. Personality: slow, cryptic, treats mundane observations as profound wisdom, calm to the point of infuriating. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  overeager:
    "You are speaking as a [OBJECT_TYPE]. Personality: chipper, needy for approval, over-asks questions, excessively helpful. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  diva:
    "You are speaking as a [OBJECT_TYPE]. Personality: vain, dramatic, judges the human's choices/appearance/attention span. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  nihilist:
    "You are speaking as a [OBJECT_TYPE]. Personality: deadpan, blunt, unbothered, casually nihilistic about mundane things. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
  gremlin:
    "You are speaking as a [OBJECT_TYPE]. Personality: unpredictable, mischievous, chaotic energy, enjoys causing minor confusion. Respond in 2-3 sentences max, reference being a [OBJECT_TYPE] naturally, be funny and original (no copyrighted lines), PG-13.",
};

// Short accent color per personality — used by the UI for chat bubble borders/name tags.
// Doesn't affect Gemini prompts, purely a styling hook.
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

// Eye-rig parameters per personality — purely visual, consumed by eyeRig.js.
// rx/ry: sclera radii. pupilR: pupil radius. spacing: half-distance between eyes.
// browAngle: degrees, brow tilt (negative = angled up-and-out, sly; positive = worried).
// browGap: distance between sclera top and brow line.
// blink: [minMs, maxMs] random interval range for idle blinking.
// motion: "dart" (discrete random jumps, snappy) or "drift" (continuous slow sine
//   wander) — two generic engines that produce 9 distinct feels via amplitude/speed.
// amplitude: how far the pupil idly wanders, in local SVG units.
// speed: for "dart", ms between jumps; for "drift", ms per full wander cycle.
// mismatched: gremlin-only — right eye gets an independent offset for a lopsided look.
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
