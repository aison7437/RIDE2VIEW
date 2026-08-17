/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked lifestyle opportunities
 * into a clean, consistent recommendation response.
 *
 * Pipeline:
 *
 * Discovery
 *     ↓
 * Reasoning
 *     ↓
 * Opportunity Scoring
 *     ↓
 * Utility Scoring
 *     ↓
 * Ranking
 *     ↓
 * Decision
 *     ↓
 * Formatter
 *     ↓
 * Lifestyle Response
 */


/**
 * Safely convert a value to a number.
 */
function safeNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


/**
 * Build a human-readable reason
 * for a recommendation.
 */
function buildReason(opportunity) {

  if (!opportunity) {

    return "This recommendation matches your current context.";

  }


  if (opportunity.reason) {

    return opportunity.reason;

  }


  if (opportunity.explanation) {

    return opportunity.explanation;

  }


  if (
    Array.isArray(
      opportunity.utilityExplanation
    ) &&
    opportunity.utilityExplanation.length > 0
  ) {

    return opportunity.utilityExplanation.join(" ");

  }


  if (
    Array.isArray(
      opportunity.reasons
    ) &&
    opportunity.reasons.length > 0
  ) {

    return (
      opportunity.reasons.join(". ") +
      "."
    );

  }


  return (
    "This recommendation matches your current context."
  );

}


/**
 * Determine the recommended action
 * based on the opportunity type.
 */
function determineAction(opportunity) {

  if (!opportunity) {

    return "view-opportunity";

  }


  if (opportunity.recommendedAction) {

    return opportunity.recommendedAction;

  }


  switch (opportunity.type) {

    case "property":

      return "view-property";


    case "mobility":

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
 * Format a single opportunity
 * into a clean recommendation.
 */
function formatRecommendation(
  opportunity,
  rank = null
) {

  if (!opportunity) {

    return null;

  }


  const utilityScore =
    opportunity.utilityScore ??
    null;


  const utilityLevel =
    opportunity.utilityLevel ||
    null;


  const utilityRank =
    opportunity.utilityRank ??
    rank ??
    null;


  return {

    id:
      opportunity.id ||
      null,


    title:
      opportunity.title ||
      null,


    type:
      opportunity.type ||
      null,


    category:
      opportunity.category ||
      null,


    service:
      opportunity.service ||
      null,


    rank:
      utilityRank,


    matchPercentage:
      opportunity.matchPercentage ??
      null,


    score:
      opportunity.score ??
      null,


    utilityScore,


    utilityLevel,


    price:
      opportunity.price ??
      null,


    budget:
      opportunity.budget ??
      null,


    location:
      opportunity.location ||
      null,


    property:
      opportunity.property ||
      null,


    decision:
      opportunity.decision ||
      null,


    priority:
      opportunity.priority ||
      null,


    primary:
      opportunity.primary === true ||
      utilityRank === 1,


    reason:
      buildReason(
        opportunity
      ),


    recommendedAction:
      determineAction(
        opportunity
      )

  };

}


/**
 * Format all recommendations.
 */
function formatRecommendations(
  recommendations = [],
  context = {}
) {

  if (
    !Array.isArray(
      recommendations
    )
  ) {

    return [];

  }


  return recommendations
    .filter(Boolean)
    .map(
      (
        opportunity,
        index
      ) => {

        return formatRecommendation(
          opportunity,
          index + 1
        );

      }
    );

}


/**
 * Select the primary recommendation.
 */
function getPrimaryRecommendation(
  recommendations
) {

  if (
    !Array.isArray(
      recommendations
    ) ||
    recommendations.length === 0
  ) {

    return null;

  }


  return (

    recommendations.find(
      item =>
        item.primary === true
    ) ||

    recommendations.find(
      item =>
        item.utilityRank === 1
    ) ||

    recommendations[0]

  );

}


/**
 * Select alternative recommendations.
 */
function getAlternativeRecommendations(
  recommendations
) {

  if (
    !Array.isArray(
      recommendations
    )
  ) {

    return [];

  }


  return recommendations.filter(
    item =>

      item.primary !== true &&

      safeNumber(
        item.rank,
        999
      ) > 1

  );

}


/**
 * Build recommendation summary.
 */
function buildSummary(
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

      excellentUtility: 0,

      highUtility: 0,

      moderateUtility: 0,

      alternatives: 0

    };

  }


  return {

    total:
      recommendations.length,


    strongMatches:
      recommendations.filter(
        item =>

          safeNumber(
            item.matchPercentage,
            0
          ) >= 90

      ).length,


    excellentUtility:
      recommendations.filter(
        item =>

          item.utilityLevel ===
          "excellent"

      ).length,


    highUtility:
      recommendations.filter(
        item =>

          item.utilityLevel ===
          "high"

      ).length,


    moderateUtility:
      recommendations.filter(
        item =>

          item.utilityLevel ===
          "moderate"

      ).length,


    alternatives:
      recommendations.filter(
        item =>

          item.primary !== true

      ).length

  };

}


/**
 * Build human-readable recommendation message.
 */
function buildMessage(
  primary,
  alternatives
) {

  if (!primary) {

    return (
      "I couldn't find a suitable recommendation " +
      "for your current needs."
    );

  }


  let message =

    `I recommend ${primary.title}. ` +
    `${primary.reason}`;


  if (
    Array.isArray(
      alternatives
    ) &&
    alternatives.length > 0
  ) {

    message +=

      ` I also found ${alternatives.length} ` +
      `alternative option` +
      `${alternatives.length === 1 ? "" : "s"} ` +
      `you may want to compare.`;

  }


  return message;

}


/**
 * Human-readable action labels.
 */
function getActionLabel(
  action
) {

  const labels = {

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


  return (

    labels[action] ||

    "View recommendation"

  );

}


/**
 * Build the complete formatted response.
 */
function buildFormattedResponse(
  recommendations = [],
  context = {}
) {

  const formatted =

    formatRecommendations(
      recommendations,
      context
    );


  const primary =

    getPrimaryRecommendation(
      formatted
    );


  const alternatives =

    getAlternativeRecommendations(
      formatted
    );


  const summary =

    buildSummary(
      formatted
    );


  return {

    success:
      true,


    agent:
      "ride2view-lifestyle-agent",


    message:
      buildMessage(
        primary,
        alternatives
      ),


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


    primary,


    alternatives,


    nextAction: {

      action:

        primary
          ? primary.recommendedAction
          : "refine-search",


      label:

        primary

          ? getActionLabel(
              primary.recommendedAction
            )

          : "Refine your search"

    },


    summary,


    recommendations:
      formatted

  };

}


/**
 * Build the Lifestyle Agent response.
 *
 * This is the function expected by
 * workflows/recommendation.js.
 *
 * It is intentionally kept as a separate
 * public function so the workflow can call
 * buildLifestyleResponse() directly.
 */
function buildLifestyleResponse(
  recommendations = [],
  context = {}
) {

  return buildFormattedResponse(
    recommendations,
    context
  );

}


/**
 * Export public API.
 */
module.exports = {

  formatRecommendations,

  formatRecommendation,

  getPrimaryRecommendation,

  getAlternativeRecommendations,

  buildSummary,

  buildFormattedResponse,

  buildLifestyleResponse,

  buildMessage,

  determineAction,

  getActionLabel

};
