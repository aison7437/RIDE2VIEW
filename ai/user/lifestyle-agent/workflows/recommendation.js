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
 * Opportunity Scoring
 *    ↓
 * Lifestyle Utility
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
 *
 * Scoring and ranking are delegated to:
 *
 * ../models/opportunity-scoring
 *
 * This keeps the workflow orchestration layer separate
 * from the scoring and utility intelligence models.
 */


/* =========================================================
   IMPORTS
   ========================================================= */

const {
  scoreOpportunity,
  rankOpportunities
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
 * The workflow delegates scoring to the
 * centralized opportunity-scoring model.
 *
 * The scoring model calculates:
 *
 * - score
 * - matchPercentage
 * - budgetEfficiency
 * - utilityScore
 * - utilityLevel
 * - utilityFactors
 * - utilityExplanation
 * ========================================================= */

function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      opportunities
    );


  return normalized.map(
    (opportunity) =>
      scoreOpportunity(
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
 * Current ranking hierarchy:
 *
 * 1. Overall score DESC
 * 2. Match percentage DESC
 * 3. Budget efficiency ASC
 * 4. Opportunity ID ASC
 *
 * IMPORTANT:
 *
 * Lifestyle Utility is currently an
 * intelligence signal and does not override
 * the existing production ranking hierarchy.
 * ========================================================= */

function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      opportunities
    );


  const ranked =
    rankOpportunities(
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
   * -------------------------------------------------------
   * SCORE
   * -------------------------------------------------------
   *
   * First calculate all scoring and utility signals.
   */

  const scoredRecommendations =
    scoreRecommendations(
      normalizedOpportunities,
      context
    );


  /*
   * -------------------------------------------------------
   * RANK
   * -------------------------------------------------------
   *
   * The centralized scoring model remains responsible
   * for production ranking behavior.
   */

  const recommendations =
    rankRecommendations(
      scoredRecommendations,
      context
    );


  /*
   * -------------------------------------------------------
   * PRIMARY RECOMMENDATION
   * -------------------------------------------------------
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * -------------------------------------------------------
   * BUDGET INFORMATION
   * -------------------------------------------------------
   */

  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  /*
   * -------------------------------------------------------
   * PRICED RECOMMENDATIONS
   * -------------------------------------------------------
   */

  const pricedRecommendations =
    recommendations.filter(
      (item) =>
        typeof getPrice(item) === "number"
    );


  /*
   * -------------------------------------------------------
   * AFFORDABLE RECOMMENDATIONS
   * -------------------------------------------------------
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
