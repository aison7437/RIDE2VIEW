/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Utility Scoring
 *    ↓
 * Ranking
 *    ↓
 * Decision
 *    ↓
 * Recommendations
 */

const {
  evaluateUtility,
  rankByUtility
} = require("../models/utility-scoring");


/**
 * Safely convert a value to a number.
 */
function numericValue(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Clamp a number between 0 and 100.
 */
function clamp(value, min = 0, max = 100) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}


/**
 * Calculate legacy score.
 *
 * This preserves the older Lifestyle Agent
 * output contract while the new utility model
 * operates independently.
 */
function calculateLegacyScore(opportunity = {}) {
  const reasoningScore = numericValue(
    opportunity.reasoningScore,
    0
  );

  const baseScore = numericValue(
    opportunity.score,
    0
  );

  if (baseScore > 0) {
    return baseScore;
  }

  if (reasoningScore > 0) {
    return reasoningScore;
  }

  return 0;
}


/**
 * Calculate legacy match percentage.
 */
function calculateMatchPercentage(opportunity = {}) {
  if (
    Number.isFinite(
      Number(opportunity.matchPercentage)
    )
  ) {
    return Number(
      opportunity.matchPercentage
    );
  }

  const utilityScore = numericValue(
    opportunity.utilityScore,
    0
  );

  if (utilityScore > 0) {
    return Number(
      clamp(utilityScore).toFixed(2)
    );
  }

  const score = numericValue(
    opportunity.score,
    0
  );

  if (score > 0) {
    return Number(
      clamp(score).toFixed(2)
    );
  }

  return null;
}


/**
 * Generate a human-readable recommendation reason.
 */
function generateReason(opportunity = {}, context = {}) {
  if (
    opportunity.reason &&
    typeof opportunity.reason === "string"
  ) {
    return opportunity.reason;
  }

  const location =
    context.location &&
    context.location.city
      ? context.location.city
      : null;

  const budget =
    numericValue(
      context.budget,
      0
    );

  const price =
    numericValue(
      opportunity.price,
      0
    );

  if (
    opportunity.type === "property"
  ) {
    if (
      opportunity.locationMatch === true &&
      budget > 0 &&
      price > 0 &&
      price <= budget
    ) {
      return `Property matches the user's location and budget.`;
    }

    if (
      opportunity.locationMatch === true &&
      budget > 0 &&
      price > budget
    ) {
      return `Property matches the user's location but exceeds the stated budget.`;
    }

    if (
      opportunity.locationMatch === true
    ) {
      return `Property matches the user's location.`;
    }
  }

  if (
    opportunity.type === "mobility" ||
    opportunity.category === "mobility"
  ) {
    return "Transportation may improve the user's journey.";
  }

  if (location) {
    return `Opportunity may be suitable for the user's needs in ${location}.`;
  }

  return "Opportunity may be suitable for the user's needs.";
}


/**
 * Generate recommended action.
 */
function generateRecommendedAction(opportunity = {}) {
  if (
    opportunity.recommendedAction
  ) {
    return opportunity.recommendedAction;
  }

  if (
    opportunity.type === "property" ||
    opportunity.category === "property"
  ) {
    return "view-property";
  }

  if (
    opportunity.type === "mobility" ||
    opportunity.category === "mobility"
  ) {
    return "book-ride";
  }

  return "view-opportunity";
}


/**
 * Build one recommendation.
 */
function buildRecommendation(
  opportunity = {},
  context = {},
  rank = 0
) {
  const utility = evaluateUtility(
    opportunity,
    context
  );

  const score =
    calculateLegacyScore(
      opportunity
    );

  const matchPercentage =
    calculateMatchPercentage(
      utility
    );

  const reason =
    generateReason(
      opportunity,
      context
    );

  const recommendedAction =
    generateRecommendedAction(
      opportunity
    );

  return {
    ...utility,

    id:
      opportunity.id,

    type:
      opportunity.type,

    category:
      opportunity.category,

    service:
      opportunity.service,

    title:
      opportunity.title,

    description:
      opportunity.description ||
      "",

    reason,

    recommendation:
      opportunity.recommendation ||
      "",

    location:
      opportunity.location ||
      null,

    price:
      opportunity.price ??
      null,

    budget:
      opportunity.budget ??
      context.budget ??
      null,

    availableTime:
      opportunity.availableTime
