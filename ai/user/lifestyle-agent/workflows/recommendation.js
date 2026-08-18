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
 * Safely convert a value to an array.
 */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}


/**
 * Extract opportunities from any supported result shape.
 */
function extractOpportunities(input) {

  if (!input) {
    return [];
  }

  /*
   * Direct array.
   */
  if (Array.isArray(input)) {
    return input;
  }

  /*
   * Common discovery shapes.
   */
  if (Array.isArray(input.opportunities)) {
    return input.opportunities;
  }

  if (Array.isArray(input.results)) {
    return input.results;
  }

  if (Array.isArray(input.data)) {
    return input.data;
  }

  if (Array.isArray(input.items)) {
    return input.items;
  }

  if (Array.isArray(input.recommendations)) {
    return input.recommendations;
  }

  /*
   * Some workflows return:
   *
   * {
   *   discovery: {
   *     opportunities: []
   *   }
   * }
   */
  if (
    input.discovery &&
    Array.isArray(input.discovery.opportunities)
  ) {
    return input.discovery.opportunities;
  }

  if (
    input.discovery &&
    Array.isArray(input.discovery.results)
  ) {
    return input.discovery.results;
  }

  /*
   * Some workflows return:
   *
   * {
   *   reasoning: {
   *     opportunities: []
   *   }
   */
  if (
    input.reasoning &&
    Array.isArray(input.reasoning.opportunities)
  ) {
    return input.reasoning.opportunities;
  }

  if (
    input.reasoning &&
    Array.isArray(input.reasoning.results)
  ) {
    return input.reasoning.results;
  }

  return [];
}


/**
 * Extract opportunities from the complete workflow state.
 */
function extractFromWorkflowState(
  discovery,
  reasoning
) {

  /*
   * Prefer reasoning output because it may contain
   * additional reasoning metadata.
   */
  let opportunities =
    extractOpportunities(
      reasoning
    );

  if (
    opportunities.length > 0
  ) {
    return opportunities;
  }

  /*
   * Fall back to discovery.
   */
  opportunities =
    extractOpportunities(
      discovery
    );

  return opportunities;
}


/**
 * Evaluate opportunities using utility scoring.
 */
function evaluateOpportunities(
  opportunities = [],
  context = {}
) {

  return toArray(
    opportunities
  ).map(
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
    toArray(
      opportunities
    ),
    context
  );

}


/**
 * Generate a recommendation reason.
 */
function generateReason(
  opportunity = {}
) {

  if (
    opportunity.type === "mobility"
  ) {

    return (
      "Transportation may improve the user's journey."
    );

  }

  if (
    opportunity.locationMatch === true &&
    opportunity.budgetCompatible === true
  ) {

    return (
      "Property matches the user's location and budget."
    );

  }

  if (
    opportunity.locationMatch === true &&
    opportunity.budgetCompatible === false
  ) {

    return (
      "Property matches the user's location but exceeds the stated budget."
    );

  }

  if (
    opportunity.locationMatch === true
  ) {

    return (
      "Property matches the user's location."
    );

  }

  if (
    opportunity.budgetCompatible === true
  ) {

    return (
      "Property matches the user's budget."
    );

  }

  return (
    "This opportunity may be suitable based on the available information."
  );

}


/**
 * Enrich a recommendation.
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
        opportunity
      ),

    recommendation:
      opportunity.recommendation ||
      "",

    recommendedAction:
      opportunity.recommendedAction ||
      (
        opportunity.type === "mobility"
          ? "book-ride"
          : "view-property"
      )

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

  return toArray(
    opportunities
  ).map(
    (opportunity) =>
      formatRecommendation(
        opportunity,
        context
      )
  );

}


/**
 * Build primary recommendation.
 */
function buildPrimaryRecommendation(
  recommendations = []
) {

  if (
    !Array.isArray(
      recommendations
    ) ||
    recommendations.length === 0
  ) {

    return null;

  }

  return {

    ...recommendations[0],

    rank: 1,

    primary: true

  };

}


/**
 * Build alternatives.
 */
function buildAlternatives(
  recommendations = []
) {

  if (
    !Array.isArray(
      recommendations
    )
  ) {

    return [];

  }

  return recommendations
    .slice(1)
    .map(
      (
        recommendation,
        index
      ) => ({

        ...recommendation,

        rank:
          index + 2,

        primary:
          false

      })
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
 * Build next action.
 */
function buildNextAction(
  primary
) {

  if (!primary) {

    return {

      action: "none",

      label:
        "No recommendation available"

    };

  }

  if (
    primary.type === "mobility"
  ) {

    return {

      action: "book-ride",

      label:
        "Book ride"

    };

  }

  return {

    action: "view-property",

    label:
      "View property"

  };

}


/**
 * Main recommendation workflow.
 *
 * Supports:
 *
 * generateLifestyleRecommendations(
 *   discovery,
 *   reasoning,
 *   context
 * )
 *
 * and:
 *
 * generateLifestyleRecommendations(
 *   {
 *     discovery,
 *     reasoning,
 *     context
 *   }
 * )
 */
function generateLifestyleRecommendations(
  discoveryInput = {},
  reasoningInput = {},
  contextInput = {}
) {

  let discovery =
    discoveryInput;

  let reasoning =
    reasoningInput;

  let context =
    contextInput;


  /*
   * Support object-style invocation.
   */
  if (
    discoveryInput &&
    !Array.isArray(discoveryInput) &&
    (
      discoveryInput.discovery ||
      discoveryInput.reasoning ||
      discoveryInput.context
    )
  ) {

    discovery =
      discoveryInput.discovery;

    reasoning =
      discoveryInput.reasoning;

    context =
      discoveryInput.context ||
      {};

  }


  /*
   * Extract actual opportunities.
   */
  const opportunities =
    extractFromWorkflowState(
      discovery,
      reasoning
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
   * Rank utility.
   */
  const ranked =
    rankOpportunities(
      evaluated,
      context
    );


  /*
   * Format recommendations.
   */
  const recommendations =
    formatRecommendations(
      ranked,
      context
    );


  /*
   * Primary recommendation.
   */
  const primary =
    buildPrimaryRecommendation(
      recommendations
    );


  /*
   * Alternatives.
   */
  const alternatives =
    buildAlternatives(
      recommendations
    );


  /*
   * Summary.
   */
  const summary =
    buildSummary(
      recommendations
    );


  /*
   * Next action.
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

  extractOpportunities,

  extractFromWorkflowState,

  evaluateOpportunities,

  rankOpportunities,

  formatRecommendation,

  formatRecommendations,

  buildPrimaryRecommendation,

  buildAlternatives,

  buildSummary,

  buildNextAction

};
