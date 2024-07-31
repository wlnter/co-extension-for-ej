export const insuranceType = Object.freeze({
  RA: "ra", // return assurance
  BP: "bp", // green shipping protection
  SP: "sp", // delivery guarantee
});

export const widgetPhase = Object.freeze({
  INIT: 1,
  LOADING: 1 << 1,
  PROCESSING: 1 << 2,
  QUOTING: 1 << 3,
  CARTING: 1 << 4,
  RENDERING: 1 << 5,
  BINDING: 1 << 6,
  COMPLETION: 1 << 7,
});

export const broadcastChannel = "seel-extensions-channel";

export const storageKey = Object.freeze({
  USER_ID: "seel_user_id",
  DEVICE_ID: "seel_device_id",
});

export const quoteSource = {
  CHECKOUT: "checkout",
  INDEX: "index",
};

export const quoteStatus = {
  ACCEPTED: "accepted",
};
