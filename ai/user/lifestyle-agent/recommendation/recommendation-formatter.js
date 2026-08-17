/**
 * Ride2View Lifestyle Agent
 * Lifestyle Response Builder
 *
 * Converts ranked recommendation decisions
 * into a clean user-facing response.
 */


/**
 * Safely convert values to numbers.
 */
function safeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


/**
 * Format currency safely.
 */
function formatCurrency(
  value
) {

  const amount =
    safeNumber(
      value,
      0
    );

  return `KSh ${amount.toLocaleString("en-KE")}`;

}


/**
 * Build explanation for a recommendation.
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
    recommendation.explanation
  ) {

    return recommendation.explanation;

  }


  if (
    recommendation.reason
  ) {

    return recommendation.reason;

  }


  if (
    Array.isArray(
      recommendation.reasons
    ) &&
    recommendation.reasons.length > 0
  ) {

    return recommendation.reasons.join(
      ". "
    ) + ".";

  }


  if (
    Array.isArray(
      recommendation.utilityExplanation
    ) &&
    recommendation.utilityExplanation.length > 0
  ) {

    return recommendation.utilityExplanation.join(
      " "
    );

  }


  return (
    "This recommendation was selected "
    + "based on the user's current context."
  );

}


/**
 * Build primary recommendation.
 */
function buildPrimaryRecommendation(
  recommendation
) {

  if (!recommendation) {
    return null;
  }


  return {

    id:
      recommendation.id ||
      null,

    title:
      recommendation.title ||
      null,

    type:
      recommendation.type ||
      null,

    category:
      recommendation.category ||
      null,

    service:
      recommendation.service ||
      null,

    matchPercentage:
      recommendation.matchPercentage ??
      null,

    score:
      recommendation.score ??
      null,

    utilityScore:
      recommendation.utilityScore ??
      null,

    utilityLevel:
      recommendation.utilityLevel ||
      null,

    decision:
      recommendation.decision ||
      "primary",

    priority:
      recommendation.priority ||
      "high",

    rank:
      recommendation.rank ??
      1,

    reason:
      buildRecommendationExplanation(
        recommendation
      ),

    recommendedAction:
      recommendation.recommendedAction ||
      determineDefaultAction(
        recommendation
      ),

    price:
      recommendation.price ??
      null,

    budget:
      recommendation.budget ??
      null,

    location:
      recommendation.location ||
      null,

    property:
      recommendation.property ||
      null

  };

}


/**
 * Determine a sensible default action.
 */
function determineDefaultAction(
  recommendation
) {

  if (!recommendation) {

    return "refine-search";

  }


  if (
    recommendation.recommendedAction
  ) {

    return recommendation.recommendedAction;

  }


  switch (
    String(
      recommendation.type ||
      recommendation.category ||
      ""
    ).toLowerCase()
  ) {

    case "property":

      return "view-property";

    case "mobility":

      return "book-ride";

    case "ride":

      return "book-ride";

    case "food":

      return "order-food";

    case "marketplace":

      return "shop";

    default:

      return "view-opportunity";

  }

}


/**
 * Build alternative recommendations.
 */
function buildAlternatives(
  recommendations
) {

  if (
    !Array.isArray(
      recommendations
    )
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
          recommendation.id ||
          null,

        title:
          recommendation.title ||
          null,

        type:
          recommendation.type ||
          null,

        category:
          recommendation.category ||
          null,

        service:
          recommendation.service ||
          null,

        matchPercentage:
          recommendation.matchPercentage ??
          null,

        score:
          recommendation.score ??
          null,

        utilityScore:
          recommendation.utilityScore ??
          null,

        utilityLevel:
          recommendation.utilityLevel ||
          null,

        decision:
          recommendation.decision ||
          "alternative",

        priority:
          recommendation.priority ||
          "medium",

        rank:
          recommendation.rank ??
          null,

        reason:
          buildRecommendationExplanation(
            recommendation
          ),

        recommendedAction:
          recommendation.recommendedAction ||
          determineDefaultAction(
            recommendation
          ),

        price:
          recommendation.price ??
          null,

        location:
          recommendation.location ||
          null

      })
    );

}


/**
 * Determine next action.
 */
function determineNextAction(
  primaryRecommendation
) {

  if (
    !primaryRecommendation
  ) {

    return {

      action:
        "refine-search",

      label:
        "Refine your search"

    };

  }


  const action =
    primaryRecommendation.recommendedAction ||
    determineDefaultAction(
      primaryRecommendation
    );


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
      "View recommendation",

    "refine-search":
      "Refine your search"

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
    !Array.isArray(
      recommendations
    )
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
          "strong-match" ||

          item.utilityLevel ===
          "excellent"
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
          item.priority ===
          "low" ||

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
    Array.isArray(
      recommendations
    )
      ? recommendations
      : [];


  /*
   * Find primary recommendation.
   */
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

    items[0] ||

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


  if (
    primaryRecommendation
  ) {

    const title =
      primaryRecommendation.title ||
      "this opportunity";


    const reason =
      primaryRecommendation.reason ||
      "It best matches your current context.";


    message =
      `I recommend ${title}. ${reason}`;

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
        null,

      availableTime:
        context.availableTime ??
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


/**
 * Public module API.
 *
 * IMPORTANT:
 * These names must match exactly
 * with the imports used by the workflow.
 */
module.exports = {

  buildLifestyleResponse,

  buildPrimaryRecommendation,

  buildAlternatives,

  determineNextAction,

  buildResponseSummary,

  buildRecommendationExplanation,

  determineDefaultAction,

  formatCurrency,

  safeNumber

};
