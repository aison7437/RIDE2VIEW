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
 * Utility Scoring Model
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
 *
 * Utility scoring is delegated to:
 *
 * ../models/opportunity-scoring
 *
 * This keeps the workflow orchestration layer separate
 * from the actual scoring model.
 */


/* =========================================================
   IMPORTS
   ========================================================= */

const {
  evaluateUtility,
  rankByUtility
} = require("../models/opportunity-scoring");


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}


function getPrice(item) {

  if (typeof item?.price === "number") {
    return item.price;
  }

  if (
    typeof item?.property?.price === "number"
  ) {
    return item.property.price;
  }

  return null;
}


/* =========================================================
   SCORE OPPORTUNITIES
   =========================================================
 *
 * The workflow does NOT calculate utility itself.
 *
 * It delegates utility calculation to the
 * centralized opportunity-scoring model.
 *
 * This prevents two competing scoring systems
 * from producing different rankings.
 * ========================================================= */

function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(opportunities);


  return normalized.map(
    (opportunity) =>
      evaluateUtility(
        opportunity,
        context
      )
  );
}


/* =========================================================
   RANK OPPORTUNITIES
   =========================================================
 *
 * Ranking is delegated to the centralized
 * opportunity-scoring model.
 *
 * The model ranks primarily by utilityScore,
 * then by opportunity score,
 * then by ID for deterministic ordering.
 * ========================================================= */

function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(opportunities);


  const ranked =
    rankByUtility(
      normalized,
      context
    );


  return ranked.map(
    (opportunity, index) => ({

      ...opportunity,

      rank:
        index + 1

    })
  );
}


/* =========================================================
   BUILD RECOMMENDATIONS
   ========================================================= */

function buildRecommendations(
  opportunities = [],
  context = {}
) {

  return rankRecommendations(
    opportunities,
    context
  );
}


/* =========================================================
   GENERATE LIFESTYLE RECOMMENDATIONS
   ========================================================= */

async function generateLifestyleRecommendations(
  input = {}
) {

  const {
    opportunities = [],
    context = {}
  } = input;


  const normalizedOpportunities =
    normalizeArray(
      opportunities
    );


  /*
   * Score and rank using the centralized
   * opportunity-scoring model.
   */

  const recommendations =
    buildRecommendations(
      normalizedOpportunities,
      context
    );


  /*
   * Primary recommendation.
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * Budget information.
   */

  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  /*
   * Identify priced recommendations.
   */

  const pricedRecommendations =
    recommendations.filter(
      (item) =>
        typeof getPrice(item) === "number"
    );


  /*
   * Identify recommendations within budget.
   */

  const affordableRecommendations =
    budget !== null
      ? pricedRecommendations.filter(
          (item) =>
            getPrice(item) <= budget
        )
      : [];


  /* =======================================================
     BUDGET FAILURE HANDLING
     ======================================================= */

  let summary =
    null;

  let nextAction =
    null;


  if (
    budget !== null &&
    pricedRecommendations.length > 0 &&
    affordableRecommendations.length === 0
  ) {

    const cheapest =
      pricedRecommendations
        .slice()
        .sort(
          (a, b) =>
            getPrice(a) -
            getPrice(b)
        )[0];


    summary =
      `No suitable property was found within the KSh ${budget} budget. The closest available alternative starts at KSh ${getPrice(cheapest)}.`;


    nextAction = {

      action:
        "increase_budget",

      label:
        "View closest alternatives"

    };

  } else if (
    recommendations.length > 0
  ) {

    nextAction = {

      action:
        "view_recommendation",

      label:
        "View recommended property"

    };
  }


  /* =======================================================
     RETURN STRUCTURED RESULT
     ======================================================= */

  return {

    success:
      true,

    count:
      recommendations.length,

    primary,

    recommendations,

    summary,

    nextAction

  };
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
