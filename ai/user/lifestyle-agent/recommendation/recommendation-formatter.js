/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into a clean,
 * user-facing recommendation structure.
 */

function formatRecommendations(
  opportunities = [],
  context = {}
) {
  if (!Array.isArray(opportunities)) {
    return [];
  }

  return opportunities.map((opportunity, index) => {
    const utilityScore =
      typeof opportunity.utilityScore === "number"
        ? Number(opportunity.utilityScore.toFixed(1))
        : null;

    const reasoningScore =
      typeof opportunity.reasoningScore === "number"
        ? opportunity.reasoningScore
        : 0;

    const rank =
      typeof opportunity.rank === "number"
        ? opportunity.rank
        : index + 1;

    const utilityLevel =
      opportunity.utilityLevel ||
      getUtilityLevel(utilityScore);

    return {
      id: opportunity.id,
      rank,

      type: opportunity.type,
      category: opportunity.category,
      service: opportunity.service,

      title: opportunity.title,
      description: opportunity.description,

      location: opportunity.location,
      price: opportunity.price,

      availability: opportunity.availability,

      // Recommendation intelligence
      utilityScore,
      matchPercentage: utilityScore,
      utilityLevel,

      reasoningScore,
      reasoningFactors:
        opportunity.reasoningFactors || [],

      utilityFactors:
        opportunity.utilityFactors || {},

      utilityExplanation:
        opportunity.utilityExplanation || [],

      reason:
        opportunity.reason || "",

      recommendation:
        opportunity.recommendation || "",

      nextAction: getNextAction(opportunity),

      source: opportunity.source || null
    };
  });
}


/**
 * Converts utility score into a human-readable level.
 */
function getUtilityLevel(score) {
  if (typeof score !== "number") {
    return "unknown";
  }

  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "high";
  }

  if (score >= 50) {
    return "moderate";
  }

  if (score >= 25) {
    return "low";
  }

  return "poor";
}


/**
 * Determines the most appropriate next action.
 */
function getNextAction(opportunity) {
  if (!opportunity) {
    return {
      action: "none",
      label: "No action available"
    };
  }

  switch (opportunity.type) {
    case "property":
      return {
        action: "view-property",
        label: "View property"
      };

    case "mobility":
      return {
        action: "book-ride",
        label: "Book ride"
      };

    case "food":
      return {
        action: "view-food",
        label: "View food options"
      };

    case "event":
      return {
        action: "view-event",
        label: "View event"
      };

    default:
      return {
        action: "view-opportunity",
        label: "View opportunity"
      };
  }
}


module.exports = {
  formatRecommendations
};
