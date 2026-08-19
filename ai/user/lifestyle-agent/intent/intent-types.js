/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Types
 *
 * Defines the normalized intent structure used by the Lifestyle Agent.
 */

const GOALS = Object.freeze({
  PROPERTY: "property",
  MOBILITY: "mobility",
  FOOD: "food",
  EVENT: "event",
  SHORT_STAY: "short-stay",
  MARKETPLACE: "marketplace",
  GENERAL: "general"
});

const USER_SEGMENTS = Object.freeze({
  GENERAL: "general",
  WOMEN_ONLY: "women-only",
  STUDENT: "student",
  VIP: "vip"
});

const MOBILITY_SEGMENTS = Object.freeze({
  GENERAL: "general",
  WOMEN_ONLY: "women-only",
  STUDENT: "student",
  VIP: "vip"
});

const PRIORITIES = Object.freeze({
  GOAL: "goal",
  LOCATION: "location",
  BUDGET: "budget",
  BEDROOMS: "bedrooms",
  CONVENIENCE: "convenience",
  MOBILITY: "mobility",
  TIME: "time",
  PREMIUM: "premium",
  STUDENT: "student",
  WOMEN_ONLY: "women-only",
  VALUE: "value"
});

const INTENT_TYPES = Object.freeze({
  GOAL: "goal",
  LOCATION: "location",
  BUDGET: "budget",
  PROPERTY: "property",
  MOBILITY: "mobility",
  USER_SEGMENT: "user-segment",
  TIME: "time",
  PREFERENCE: "preference"
});

module.exports = {
  GOALS,
  USER_SEGMENTS,
  MOBILITY_SEGMENTS,
  PRIORITIES,
  INTENT_TYPES
};
