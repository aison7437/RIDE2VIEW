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
 * Utility Evaluation
 *    ↓
 * Utility Ranking
 *    ↓
 * Recommendation Formatting
 */

const {
  evaluateUtility,
  rankByUtility
} = require("../models/utility-scoring");


/**
 * Safely convert a value into an array.
 */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}


/**
 * Safely get an opportunity array from discovery output.
 */
function extractOpportunities(discoveryResult) {

  if (!discoveryResult) {
    return [];
  }

  if (Array.isArray(discoveryResult)) {
    return discoveryResult;
  }

  if (Array.isArray(discoveryResult.opportunities)) {
    return discoveryResult.opportunities;
  }

  if (Array.isArray(discoveryResult.results)) {
    return discoveryResult.results;
  }

  if (Array.isArray(discoveryResult.data)) {
    return discoveryResult.data;
  }

  return [];
}


/**
 * Evaluate opportunities using the utility model.
 */
function evaluateOpportunities(
  opportunities = [],
  context = {}
) {

  return toArray(opportunities).map(
    (opportunity) =>
      evaluateUtility(
        opportunity,
        context
      )
  );

}


/**
 * Rank opportunities using utility scoring.
 */
function rankOpportunities(
  opportunities = [],
  context = {}
) {

  return rankByUtility(
    toArray(opportunities),
    context
  );

}


/**
 * Build the primary recommendation.
 */
function buildPrimaryRecommendation(
  rankedOpportunities = []
) {

  if (
    !Array.isArray(rankedOpportunities) ||
    rankedOpportunities.length === 0
  ) {
    return null;
  }

  const primary = rankedOpportunities[0];

  return {
    ...primary,

    rank: 1,

    primary: true
  };

}


/**
 * Build alternative recommendations.
 */
function buildAlternatives(
  rankedOpportunities = []
) {

  if (
    !Array.isArray(rankedOpportunities)
  ) {
    return [];
  }

  return rankedOpportunities
    .slice(1)
    .map(
      (opportunity, index) => ({
        ...opportunity,

        rank: index + 2,

        primary: false
      })
    );

}


/**
 * Generate human-readable reason.
 */
function generateReason(
  opportunity = {},
  context = {}
) {

  const reasons = [];

  if (
    opportunity.locationMatch === true
  ) {
    reasons.push(
      "Property matches the user's location."
    );
  }

  if (
    opportunity.budgetCompatible === true
  ) {
    reasons.push(
      "Property matches the user's budget."
    );
  }

  if (
    opportunity.preferenceMatch === true
  ) {
    reasons.push(
      "Property matches the user's preferences."
    );
  }

  if (
    opportunity.timeCompatible === true
  ) {
    reasons.push(
      "Property is compatible with the user's available time."
    );
  }

  if (
    opportunity.type === "mobility"
  ) {
    return (
      "Transportation may improve the user's journey."
    );
  }

  if (
    reasons.length === 0
  ) {
    return (
      "This opportunity may be suitable based on the available information."
    );
  }

  return reasons.join(" ");
}


/**
 * Attach recommendation metadata.
 */
function enrichRecommendation(
  opportunity = {},
  context = {}
) {

  return {

    ...opportunity,

    reason:
      opportunity.reason ||
      generateReason(
        opportunity,
        context
      ),

    recommendation:
      opportunity.recommendation ||
      "",

    recommendedAction:
      opportunity.type === "mobility"
        ? "book-ride"
        : "view-property"

  };

}


/**
 * Format one recommendation.
 */
function formatRecommendation(
  opportunity = {},
  context = {}
) {

  return enrichRecommendation(
    opportunity,
    context
  );

}


/**
 * Format all recommendations.
 */
function formatRecommendations(
  opportunities = [],
  context = {}
) {

  return toArray(opportunities)
    .map(
      (opportunity) =>
        formatRecommendation(
          opportunity,
          context
        )
    );

}


/**
 * Build recommendation summary.
 */
function buildSummary(
  recommendations = []
) {

  const items =
    toArray(
      recommendations
    );

  return {

    total:
      items.length,

    strongMatches:
      items.filter(
        (item) =>
          Number(
            item.matchPercentage ?? 0
          ) >= 75
      ).length,

    excellentUtility:
      items.filter(
        (item) =>
          item.utilityLevel === "excellent"
      ).length,

    highUtility:
      items.filter(
        (item) =>
          item.utilityLevel === "high"
      ).length,

    moderateUtility:
      items.filter(
        (item) =>
          item.utilityLevel === "moderate"
      ).length,

    alternatives:
      Math.max(
        items.length - 1,
        0
      )

  };

}


/**
 * Build the next action.
 */
function buildNextAction(
  primary
) {

  if (!primary) {

    return {
      action: "none",
      label: "No recommendation available"
    };

  }

  if (
    primary.type === "mobility"
  ) {

    return {
      action: "book-ride",
      label: "Book ride"
    };

  }

  return {
    action: "view-property",
    label: "View property"
  };

}


/**
 * Generate the Lifestyle Agent recommendations.
 *
 * This is the main function imported by index.js.
 */
function generateLifestyleRecommendations(
  discoveryResult = {},
  context = {}
) {

  const opportunities =
    extractOpportunities(
      discoveryResult
    );


  /*
   * Evaluate utility.
   */
  const evaluated =
    evaluateOpportunities(
      opportunities,
      context
    );


  /*
   * Rank by utility.
   */
  const ranked =
    rankOpportunities(
      evaluated,
      context
    );


  /*
   * Add recommendation metadata.
   */
  const recommendations =
    formatRecommendations(
      ranked,
      context
    );


  /*
   * Build primary recommendation.
   */
  const primary =
    buildPrimaryRecommendation(
      recommendations
    );


  /*
   * Build alternatives.
   */
  const alternatives =
    buildAlternatives(
      recommendations
    );


  /*
   * Build summary.
   */
  const summary =
    buildSummary(
      recommendations
    );


  /*
   * Build next action.
   */
  const nextAction =
    buildNextAction(
      primary
    );


  return {

    success: true,

    count:
      recommendations.length,

    primary,

    alternatives,

    recommendations,

    nextAction,

    summary

  };

}


/**
 * Export workflow.
 */
module.exports = {

  generateLifestyleRecommendations,

  evaluateOpportunities,

  rankOpportunities,

  buildPrimaryRecommendation,

  buildAlternatives,

  formatRecommendation,

  formatRecommendations,

  buildSummary,

  buildNextAction

};
