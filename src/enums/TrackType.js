const TrackType = {
  TOP: "top",
  TOP_A: "topA",
  TOP_B: "topB",
  BOTTOM: "bottom",
  BOTTOM_A: "bottomA",
  BOTTOM_B: "bottomB",
  BALANCED: "balanced",
  BALANCED_A: "balancedA",
  BALANCED_B: "balancedB",
  ANTI_TOP: "antitop",
  ANTI_TOP_A: "antiTopA",
  ANTI_TOP_B: "antiTopB",
};

TrackType.normalize = function (input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  const normalized = input.toLowerCase().trim();

  const mapping = {
    top: TrackType.TOP,
    topa: TrackType.TOP_A,
    "top-a": TrackType.TOP_A,
    top_a: TrackType.TOP_A,
    topb: TrackType.TOP_B,
    "top-b": TrackType.TOP_B,
    top_b: TrackType.TOP_B,
    bottom: TrackType.BOTTOM,
    bottoma: TrackType.BOTTOM_A,
    "bottom-a": TrackType.BOTTOM_A,
    bottom_a: TrackType.BOTTOM_A,
    bottomb: TrackType.BOTTOM_B,
    "bottom-b": TrackType.BOTTOM_B,
    bottom_b: TrackType.BOTTOM_B,
    balanced: TrackType.BALANCED,
    balanceda: TrackType.BALANCED_A,
    "balanced-a": TrackType.BALANCED_A,
    balanced_a: TrackType.BALANCED_A,
    balancedb: TrackType.BALANCED_B,
    "balanced-b": TrackType.BALANCED_B,
    balanced_b: TrackType.BALANCED_B,
    antitop: TrackType.ANTI_TOP,
    antitopa: TrackType.ANTI_TOP_A,
    "antitop-a": TrackType.ANTI_TOP_A,
    antitop_a: TrackType.ANTI_TOP_A,
    antitopb: TrackType.ANTI_TOP_B,
    "antitop-b": TrackType.ANTI_TOP_B,
    antitop_b: TrackType.ANTI_TOP_B,

    removetopa: TrackType.ANTI_TOP_A,
    "removetop-a": TrackType.ANTI_TOP_A,
    removetop_a: TrackType.ANTI_TOP_A,
    removetopb: TrackType.ANTI_TOP_B,
    "removetop-b": TrackType.ANTI_TOP_B,
    removetop_b: TrackType.ANTI_TOP_B,
  };

  return mapping[normalized] || null;
};

TrackType.getAllValues = function () {
  return [
    TrackType.TOP,
    TrackType.TOP_A,
    TrackType.TOP_B,
    TrackType.BOTTOM,
    TrackType.BOTTOM_A,
    TrackType.BOTTOM_B,
    TrackType.BALANCED,
    TrackType.BALANCED_A,
    TrackType.BALANCED_B,
    TrackType.ANTI_TOP,
    TrackType.ANTI_TOP_A,
    TrackType.ANTI_TOP_B,
  ];
};

TrackType.getDisplayValues = function () {
  return ["balanced", "top", "antitop", "bottom"];
};

TrackType.isValid = function (value) {
  return TrackType.getAllValues().includes(value);
};

Object.freeze(TrackType.TOP);
Object.freeze(TrackType.TOP_A);
Object.freeze(TrackType.TOP_B);
Object.freeze(TrackType.BOTTOM);
Object.freeze(TrackType.BOTTOM_A);
Object.freeze(TrackType.BOTTOM_B);
Object.freeze(TrackType.BALANCED);
Object.freeze(TrackType.BALANCED_A);
Object.freeze(TrackType.BALANCED_B);
Object.freeze(TrackType.ANTI_TOP);
Object.freeze(TrackType.ANTI_TOP_A);
Object.freeze(TrackType.ANTI_TOP_B);

module.exports = TrackType;
