/**
 * Ride2View Lifestyle Agent
 * Lifestyle Response Builder
 *
 * Purpose:
 * Converts recommendation decisions into
 * a clean user-facing lifestyle response.
 *
 * Pipeline:
 *
 * Discovery
 *     ↓
 * Reasoning
 *     ↓
 * Ranking
 *     ↓
 * Decision
 *     ↓
 * Response Builder
 */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Format currency safely.
 */
function formatCurrency(value) {

  const amount =
    safeNumber(value, 0);

  return `KSh ${amount.toLocaleString("en-KE")}`;
}


/**
 * Build a concise explanation for a recommendation.
 */
function buildRecommendationExplanation(
  recommendation
) {

  if (!recommendation) {
    return "";
  }

  if (
    recommendation.decisionReason
  ) {

    return recommendation.decisionReason;

  }

  if (
    recommendation.reason
  ) {

    return recommendation.reason;

  }

  return (
    "This recommendation was selected "
    + "based on the user's current context."
  );
}


/**
 * Build the primary recommendation.
 */
function buildPrimaryRecommendation(
  recommendation
) {

  if (!recommendation) {
    return null;
  }

  return {

    id:
      recommendation.id || null,

    title:
      recommendation.title || null,

    type:
      recommendation.type || null,

    category:
      recommendation.category || null,

    matchPercentage:
      recommendation.matchPercentage ?? null,

    score:
      recommendation.score ?? null,

    decision:
      recommendation.decision || "primary",

    priority:
      recommendation.priority || "high",

    reason:
      buildRecommendationExplanation(
        recommendation
      ),

    recommendedAction:
      recommendation.recommendedAction ||
      "view-opportunity",

    price:
      recommendation.price ?? null,

    budget:
      recommendation.budget ?? null,

    location:
      recommendation.location || null

  };
}


/**
 * Build alternative recommendations.
 */
function buildAlternatives(
  recommendations
) {

  if (
    !Array.isArray(recommendations)
  ) {

    return [];

  }

  return recommendations
    .filter(
      recommendation =>
        recommendation.primary !== true
    )
    .filter(
      recommendation =>
        recommendation.decision ===
          "recommended" ||
        recommendation.decision ===
          "alternative"
    )
    .map(
      recommendation => ({

        id:
          recommendation.id || null,

        title:
          recommendation.title || null,

        type:
          recommendation.type || null,

        matchPercentage:
          recommendation.matchPercentage ?? null,

        decision:
          recommendation.decision,

        priority:
          recommendation.priority,

        reason:
          buildRecommendationExplanation(
            recommendation
          ),

        recommendedAction:
          recommendation.recommendedAction ||
          "view-opportunity",

        price:
          recommendation.price ?? null

      })
    );

}


/**
 * Determine the next action.
 */
function determineNextAction(
  primaryRecommendation
) {

  if (!primaryRecommendation) {

    return {

      action:
        "refine-search",

      label:
        "Refine your search"

    };

  }


  const action =
    primaryRecommendation.recommendedAction ||
    "view-opportunity";


  const actionLabels = {

    "view-property":
      "View property",

    "compare-property":
      "Compare properties",

    "review-property":
      "Review property",

    "book-ride":
      "Book ride",

    "order-food":
      "Order food",

    "shop":
      "Shop",

    "review-food":
      "Review food",

    "review-marketplace":
      "Review marketplace",

    "view-opportunity":
      "View recommendation"

  };


  return {

    action,

    label:
      actionLabels[action] ||
      "View recommendation"

  };

}


/**
 * Build summary statistics.
 */
function buildResponseSummary(
  recommendations
) {

  if (
    !Array.isArray(recommendations)
  ) {

    return {

      total: 0,

      strongMatches: 0,

      recommended: 0,

      alternatives: 0,

      lowPriority: 0

    };

  }


  return {

    total:
      recommendations.length,

    strongMatches:
      recommendations.filter(
        item =>
          item.recommendationTier ===
          "strong-match"
      ).length,

    recommended:
      recommendations.filter(
        item =>
          item.decision ===
          "recommended"
      ).length,

    alternatives:
      recommendations.filter(
        item =>
          item.decision ===
          "alternative"
      ).length,

    lowPriority:
      recommendations.filter(
        item =>
          item.decision ===
          "low-priority"
      ).length

  };

}


/**
 * Build complete lifestyle response.
 */
function buildLifestyleResponse(
  recommendations,
  context = {}
) {

  const items =
    Array.isArray(recommendations)
      ? recommendations
      : [];


  const primary =
    items.find(
      recommendation =>
        recommendation.primary === true
    ) ||
    items.find(
      recommendation =>
        recommendation.decision ===
        "primary"
    ) ||
    null;


  const primaryRecommendation =
    buildPrimaryRecommendation(
      primary
    );


  const alternatives =
    buildAlternatives(
      items
    );


  const nextAction =
    determineNextAction(
      primaryRecommendation
    );


  const summary =
    buildResponseSummary(
      items
    );


  let message =
    "I found recommendations based on "
    + "your current needs.";


  if (primaryRecommendation) {

    message =
      `I recommend ${primaryRecommendation.title}. ` +
      `${primaryRecommendation.reason}`;

  }


  return {

    success:
      true,

    agent:
      "ride2view-lifestyle-agent",

    message,

    context: {

      goal:
        context.userGoal ||
        context.goal ||
        null,

      location:
        context.location ||
        null,

      budget:
        context.budget ??
        null

    },

    primary:
      primaryRecommendation,

    alternatives,

    nextAction,

    summary,

    recommendations:
      items

  };

}


module.exports = {

  buildLifestyleResponse,

  buildPrimaryRecommendation,

  buildAlternatives,

  determineNextAction,

  buildResponseSummary,

  buildRecommendationExplanation

};
