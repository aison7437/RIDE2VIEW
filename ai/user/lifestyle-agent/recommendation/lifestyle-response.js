/**
 * Ride2View Lifestyle Agent
 * Lifestyle Response Builder
 *
 * Purpose:
 * Converts recommendation decisions into a
 * clean user-facing response object.
 *
 * Pipeline position:
 *
 * Discovery
 *     ↓
 * Canonical Opportunity
 *     ↓
 * Reasoning
 *     ↓
 * Ranking
 *     ↓
 * Recommendation Formatter
 *     ↓
 * Recommendation Decision
 *     ↓
 * Lifestyle Response
 *
 * This module DOES NOT:
 * - recalculate scores
 * - change rankings
 * - discover opportunities
 * - perform external API calls
 *
 * It only converts existing intelligence
 * into an actionable response.
 */


/**
 * Safely convert a value into a number.
 */
function safeNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


/**
 * Format Kenyan Shilling amounts.
 */
function formatCurrency(value) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {

    return null;

  }

  return (
    "KSh " +
    Number(value).toLocaleString("en-KE")
  );

}


/**
 * Build a human-readable location.
 */
function formatLocation(location = {}) {

  const parts = [];

  if (location.city) {
    parts.push(location.city);
  }

  if (location.country) {
    parts.push(location.country);
  }

  return parts.join(", ") || null;

}


/**
 * Determine the primary recommendation.
 */
function getPrimaryRecommendation(
  recommendations
) {

  if (!Array.isArray(recommendations)) {
    return null;
  }

  return (
    recommendations.find(
      item => item.primary === true
    ) ||
    recommendations.find(
      item => item.decision === "primary"
    ) ||
    recommendations[0] ||
    null
  );

}


/**
 * Extract alternative recommendations.
 */
function getAlternatives(
  recommendations,
  primary
) {

  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.filter(
    item =>
      item.id !== primary?.id &&
      (
        item.decision === "recommended" ||
        item.decision === "alternative"
      )
  );

}


/**
 * Extract low-priority opportunities.
 */
function getLowPriority(
  recommendations
) {

  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.filter(
    item =>
      item.decision === "low-priority"
  );

}


/**
 * Build match reasons.
 */
function buildMatchReasons(
  recommendation
) {

  if (
    Array.isArray(
      recommendation?.matchReasons
    )
  ) {

    return [
      ...recommendation.matchReasons
    ];

  }

  return [];

}


/**
 * Build primary recommendation presentation.
 */
function buildPrimary(
  recommendation
) {

  if (!recommendation) {
    return null;
  }

  return {

    id:
      recommendation.id || null,

    type:
      recommendation.type || null,

    title:
      recommendation.title ||
      "Lifestyle Opportunity",

    description:
      recommendation.description || "",

    category:
      recommendation.category || null,

    service:
      recommendation.service || null,

    matchPercentage:
      safeNumber(
        recommendation.matchPercentage
      ),

    score:
      safeNumber(
        recommendation.score
      ),

    recommendationTier:
      recommendation.recommendationTier ||
      null,

    decision:
      recommendation.decision ||
      "primary",

    priority:
      recommendation.priority ||
      "high",

    primary:
      recommendation.primary === true,

    reason:
      recommendation.decisionReason ||
      recommendation.reason ||
      "",

    action:
      recommendation.recommendedAction ||
      "view-opportunity",

    location:
      formatLocation(
        recommendation.location
      ),

    price:
      formatCurrency(
        recommendation.price
      ),

    budget:
      formatCurrency(
        recommendation.budget
      ),

    matchReasons:
      buildMatchReasons(
        recommendation
      )

  };

}


/**
 * Build an alternative recommendation.
 */
function buildAlternative(
  recommendation
) {

  return {

    id:
      recommendation.id || null,

    type:
      recommendation.type || null,

    title:
      recommendation.title ||
      "Lifestyle Opportunity",

    matchPercentage:
      safeNumber(
        recommendation.matchPercentage
      ),

    score:
      safeNumber(
        recommendation.score
      ),

    decision:
      recommendation.decision ||
      "alternative",

    priority:
      recommendation.priority ||
      "low",

    reason:
      recommendation.decisionReason ||
      recommendation.reason ||
      "",

    action:
      recommendation.recommendedAction ||
      "review-opportunity",

    location:
      formatLocation(
        recommendation.location
      ),

    price:
      formatCurrency(
        recommendation.price
      )

  };

}


/**
 * Build action summary.
 */
function buildActionSummary(
  primary
) {

  if (!primary) {

    return {

      action:
        "search-again",

      label:
        "Search again",

      target:
        null

    };

  }


  const action =
    primary.recommendedAction ||
    "view-opportunity";


  const labels = {

    "view-property":
      "View property",

    "compare-property":
      "Compare properties",

    "review-property":
      "Review property",

    "book-ride":
      "Book ride",

    "review-ride":
      "Review ride",

    "order-food":
      "Order food",

    "review-food":
      "Review food",

    "shop":
      "Start shopping",

    "review-marketplace":
      "Review marketplace",

    "view-opportunity":
      "View opportunity"

  };


  return {

    action:

      action,

    label:

      labels[action] ||
      "View opportunity",

    target:

      primary.id || null

  };

}


/**
 * Build a concise user-facing message.
 */
function buildMessage(
  primary,
  alternatives
) {

  if (!primary) {

    return (
      "I couldn't identify a suitable opportunity " +
      "from the current results."
    );

  }


  const title =
    primary.title ||
    "Recommended opportunity";


  const match =
    safeNumber(
      primary.matchPercentage
    );


  let message =
    `I found a strong match: ${title}`;


  if (match > 0) {

    message +=
      ` with a ${match.toFixed(1)}% match.`;

  }


  if (primary.price) {

    message +=
      ` The listed price is ${primary.price}.`;

  }


  if (
    alternatives.length > 0
  ) {

    message +=
      ` I also found ${alternatives.length} alternative` +
      `${alternatives.length === 1 ? "" : "s"}.`;

  }


  return message;

}


/**
 * Build complete Lifestyle Agent response.
 */
function buildLifestyleResponse(
  recommendations
) {

  if (
    !Array.isArray(
      recommendations
    )
  ) {

    recommendations = [];

  }


  const primary =
    getPrimaryRecommendation(
      recommendations
    );


  const alternatives =
    getAlternatives(
      recommendations,
      primary
    );


  const lowPriority =
    getLowPriority(
      recommendations
    );


  const primaryPresentation =
    buildPrimary(
      primary
    );


  const alternativePresentation =
    alternatives.map(
      buildAlternative
    );


  const action =
    buildActionSummary(
      primary
    );


  const message =
    buildMessage(
      primaryPresentation,
      alternativePresentation
    );


  return {

    success:
      Boolean(primary),

    agent:
      "ride2view-lifestyle-agent",

    version:
      "1.0.0",

    message:

      message,

    primary:

      primaryPresentation,

    alternatives:

      alternativePresentation,

    lowPriority:

      lowPriority.map(
        buildAlternative
      ),

    action:

      action,

    summary: {

      total:
        recommendations.length,

      primary:
        primary ? 1 : 0,

      alternatives:
        alternativePresentation.length,

      lowPriority:
        lowPriority.length

    },

    generatedAt:
      new Date().toISOString()

  };

}


module.exports = {

  buildLifestyleResponse,

  buildPrimary,

  buildAlternative,

  buildActionSummary,

  buildMessage,

  getPrimaryRecommendation,

  getAlternatives,

  getLowPriority,

  formatCurrency,

  formatLocation

};
