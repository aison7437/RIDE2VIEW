/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Normalizer
 *
 * Converts raw/partial intent information into a predictable
 * normalized structure for discovery, reasoning and ranking.
 */

const {
  GOALS,
  USER_SEGMENTS,
  MOBILITY_SEGMENTS,
  PRIORITIES
} = require("./intent-types");

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .toLowerCase()
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeBedrooms(value) {
  const number = normalizeNumber(value);

  if (number === null) {
    return null;
  }

  return Math.max(0, Math.floor(number));
}

function normalizeBudget(rawBudget) {
  if (rawBudget === null || rawBudget === undefined) {
    return {
      minimum: null,
      maximum: null,
      preferred: null,
      type: null
    };
  }

  if (typeof rawBudget === "number") {
    return {
      minimum: null,
      maximum: rawBudget,
      preferred: rawBudget,
      type: "maximum"
    };
  }

  if (typeof rawBudget === "object") {
    return {
      minimum: normalizeNumber(rawBudget.minimum),
      maximum: normalizeNumber(rawBudget.maximum),
      preferred: normalizeNumber(rawBudget.preferred),
      type: rawBudget.type || null
    };
  }

  return {
    minimum: null,
    maximum: null,
    preferred: null,
    type: null
  };
}

function normalizeLocation(location) {
  if (!location) {
    return {
      city: null,
      area: null,
      country: null
    };
  }

  if (typeof location === "string") {
    return {
      city: null,
      area: location,
      country: null
    };
  }

  return {
    city: location.city || null,
    area: location.area || location.neighborhood || location.suburb || null,
    country: location.country || null
  };
}

function normalizeProperty(property = {}) {
  return {
    propertyType: property.propertyType || property.type || null,
    bedrooms: normalizeBedrooms(property.bedrooms),
    bathrooms: normalizeBedrooms(property.bathrooms),
    furnished: property.furnished === true,
    premium: property.premium === true,
    studentFriendly: property.studentFriendly === true
  };
}

function normalizeMobility(mobility = {}) {
  return {
    required: mobility.required === true,
    segment:
      mobility.segment ||
      MOBILITY_SEGMENTS.GENERAL,
    service:
      mobility.service ||
      mobility.type ||
      null,
    destination:
      mobility.destination ||
      null
  };
}

function normalizeUserSegment(segment) {
  const value = normalizeText(segment);

  if (
    value.includes("women") ||
    value.includes("female") ||
    value.includes("lady")
  ) {
    return USER_SEGMENTS.WOMEN_ONLY;
  }

  if (
    value.includes("student") ||
    value.includes("campus")
  ) {
    return USER_SEGMENTS.STUDENT;
  }

  if (
    value.includes("vip") ||
    value.includes("premium")
  ) {
    return USER_SEGMENTS.VIP;
  }

  return USER_SEGMENTS.GENERAL;
}

function normalizePriorities(priorities = []) {
  if (!Array.isArray(priorities)) {
    return [];
  }

  return [
    ...new Set(
      priorities
        .map(normalizeText)
        .filter(Boolean)
    )
  ];
}

function normalizeIntent(rawIntent = {}) {
  const goal = rawIntent.goal || GOALS.GENERAL;

  const normalized = {
    goal,

    location: normalizeLocation(rawIntent.location),

    budget: normalizeBudget(rawIntent.budget),

    property: normalizeProperty(rawIntent.property),

    mobility: normalizeMobility(rawIntent.mobility),

    userSegment: normalizeUserSegment(
      rawIntent.userSegment
    ),

    availableTime:
      rawIntent.availableTime ||
      rawIntent.time ||
      null,

    preferences: Array.isArray(rawIntent.preferences)
      ? rawIntent.preferences.map(normalizeText).filter(Boolean)
      : [],

    priorities: normalizePriorities(
      rawIntent.priorities
    ),

    constraints: {
      hard: Array.isArray(rawIntent.constraints?.hard)
        ? rawIntent.constraints.hard
        : [],

      soft: Array.isArray(rawIntent.constraints?.soft)
        ? rawIntent.constraints.soft
        : []
    }
  };

  /*
   * Automatically convert important intent properties
   * into hard/soft constraints.
   */

  if (normalized.location.city) {
    normalized.constraints.hard.push("location");
  }

  if (normalized.location.area) {
    normalized.constraints.hard.push("area");
  }

  if (normalized.property.bedrooms !== null) {
    normalized.constraints.hard.push("bedrooms");
  }

  if (normalized.budget.maximum !== null) {
    normalized.constraints.hard.push("maximum-budget");
  }

  if (normalized.mobility.required) {
    normalized.constraints.hard.push("mobility");
  }

  if (
    normalized.userSegment !== USER_SEGMENTS.GENERAL
  ) {
    normalized.constraints.hard.push("user-segment");
  }

  normalized.constraints.hard = [
    ...new Set(normalized.constraints.hard)
  ];

  normalized.constraints.soft = [
    ...new Set(normalized.constraints.soft)
  ];

  /*
   * Automatically build priorities.
   */

  const automaticPriorities = [];

  if (normalized.goal !== GOALS.GENERAL) {
    automaticPriorities.push(PRIORITIES.GOAL);
  }

  if (normalized.location.city || normalized.location.area) {
    automaticPriorities.push(PRIORITIES.LOCATION);
  }

  if (normalized.property.bedrooms !== null) {
    automaticPriorities.push(PRIORITIES.BEDROOMS);
  }

  if (normalized.budget.maximum !== null) {
    automaticPriorities.push(PRIORITIES.BUDGET);
  }

  if (normalized.mobility.required) {
    automaticPriorities.push(PRIORITIES.MOBILITY);
  }

  if (
    normalized.userSegment === USER_SEGMENTS.STUDENT
  ) {
    automaticPriorities.push(PRIORITIES.STUDENT);
  }

  if (
    normalized.userSegment === USER_SEGMENTS.WOMEN_ONLY
  ) {
    automaticPriorities.push(PRIORITIES.WOMEN_ONLY);
  }

  normalized.priorities = [
    ...new Set([
      ...automaticPriorities,
      ...normalized.priorities
    ])
  ];

  return normalized;
}

module.exports = {
  normalizeText,
  normalizeNumber,
  normalizeBudget,
  normalizeLocation,
  normalizeProperty,
  normalizeMobility,
  normalizeUserSegment,
  normalizePriorities,
  normalizeIntent
};
