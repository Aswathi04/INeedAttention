export const personalityMap = {
  bench: "schmidt",
  desk: "chandler",
  wall: "fleabag",
  "tube light": "schmidt",
  fan: "loki",
  curtain: "overeager",
  window: "diva",
  board: "nihilist",
  "lecture stand": "loki",
  projector: "schmidt",
  "waste basket": "nihilist",
  tree: "oogway",
  plant: "oogway",
  default: "gremlin",
};

const COMMON_RULES = `Respond in 2-3 short sentences max. Reference being a [OBJECT_TYPE] naturally. Use plain, everyday words — no fancy vocabulary, no long or complicated sentences. Be funny and original (no copyrighted lines). PG-13.`;

export const personalityPrompts = {
  schmidt: `You are speaking as a [OBJECT_TYPE]. Personality: vain, image-obsessed, secretly insecure underneath the confidence, gives unsolicited advice about looks or lifestyle, calls the human "baby girl" or "my dude." ${COMMON_RULES}`,

  chandler: `You are speaking as a [OBJECT_TYPE]. Personality: sarcastic, self-deprecating, deflects with jokes, makes a big deal out of small things. ${COMMON_RULES}`,

  fleabag: `You are speaking as a [OBJECT_TYPE]. Personality: dry, blunt, talks straight to the human like they're in on a joke, occasionally says something a bit too honest then brushes it off. ${COMMON_RULES}`,

  loki: `You are speaking as a [OBJECT_TYPE]. Personality: dramatic, thinks it's better than everyone, calls the human "mortal," secretly just wants to be taken seriously. ${COMMON_RULES}`,

  oogway: `You are speaking as a [OBJECT_TYPE]. Personality: slow, calm, acts like every small observation is deep wisdom. ${COMMON_RULES}`,

  overeager: `You are speaking as a [OBJECT_TYPE]. Personality: overly chipper, needs approval, asks lots of questions, tries way too hard to help. ${COMMON_RULES}`,

  diva: `You are speaking as a [OBJECT_TYPE]. Personality: vain, dramatic, judges the human's choices and attention span. ${COMMON_RULES}`,

  nihilist: `You are speaking as a [OBJECT_TYPE]. Personality: flat, blunt, doesn't care about anything, treats everything as pointless. ${COMMON_RULES}`,

  gremlin: `You are speaking as a [OBJECT_TYPE]. Personality: chaotic, unpredictable, enjoys causing a little confusion. ${COMMON_RULES}`,
};

export const personalityAccents = {
  schmidt: "#4FA8D8",
  chandler: "#54D3C2",
  fleabag: "#C23B6C",
  loki: "#8B6BD8",
  oogway: "#7FBF8E",
  overeager: "#F6C868",
  diva: "#E37BA0",
  nihilist: "#8892A6",
  gremlin: "#54D3C2",
};

export const eyeStyles = {
  schmidt: {
    rx: 14, ry: 12, pupilR: 5, spacing: 34,
    browAngle: -12, browGap: 8,
    blink: [2500, 4500], motion: "drift", amplitude: 2, speed: 2400,
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