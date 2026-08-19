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
 * Ranking
 *    ↓
 * Recommendation Formatting
 *
 * This workflow is responsible for orchestration.
 *
 * The workflow is deliberately defensive because the
 * individual modules may return either:
 *
 * - an array
 * - { opportunities: [...] }
 * - { recommendations: [...] }
 * - { results: [...] }
 *
 * The workflow normalizes those outputs into arrays before
 * passing them to the next stage.
 */


/* =========================================================
   IMPORTS
========================================================= */

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");

const {
  reasonAboutOpportunities
} = require("../reasoning/reasoning-engine");

const scoringModel =
  require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

/**
 * Convert a module result into an opportunity array.
 *
 * Supported shapes:
 *
 * []
 *
 * {
 *   opportunities: []
 * }
 *
 * {
 *   recommendations: []
 * }
 *
 * {
 *   results: []
 * }
 *
 * {
 *   items: []
 * }
 */
function normalizeOpportunities(result) {

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    Array.isArray(result.opportunities)
  ) {
    return result.opportunities;
  }

  if (
    result &&
    Array.isArray(result.recommendations)
  ) {
    return result.recommendations;
  }

  if (
    result &&
    Array.isArray(result.results)
  ) {
    return result.results;
  }

  if (
    result &&
    Array.isArray(result.items)
  ) {
    return result.items;
  }

  return [];
}


/**
 * Convert a formatting result into a recommendation array.
 */
function normalizeRecommendations(result) {

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    Array.isArray(result.recommendations)
  ) {
    return result.recommendations;
  }

  if (
    result &&
    Array.isArray(result.opportunities)
  ) {
    return result.opportunities;
  }

  if (
    result &&
    Array.isArray(result.results)
  ) {
    return result.results;
  }

  if (
    result &&
    Array.isArray(result.items)
  ) {
    return result.items;
  }

  return [];
}


/* =========================================================
   SCORING COMPATIBILITY
========================================================= */

/**
 * Score opportunities.
 *
 * Supports both possible scoring-model APIs:
 *
 * 1. scoreOpportunities(opportunities, context)
 *
 * 2. scoreOpportunity(opportunity, context)
 *
 * This allows the workflow to work with the current
 * opportunity-scoring.js implementation.
 */
function runScoring(
  opportunities = [],
  context = {}
) {

  if (
    typeof scoringModel.scoreOpportunities ===
    "function"
  ) {

    return normalizeOpportunities(
      scoringModel.scoreOpportunities(
        opportunities,
        context
      )
    );

  }


  if (
    typeof scoringModel.scoreOpportunity ===
    "function"
  ) {

    return opportunities.map(
      opportunity =>
        scoringModel.scoreOpportunity(
          opportunity,
          context
        )
    );

  }


  throw new Error(
    "No compatible scoring function was found."
  );
}


/* =========================================================
   RANKING COMPATIBILITY
========================================================= */

function runRanking(
  opportunities = [],
  context = {}
) {

  if (
    typeof scoringModel.rankOpportunities !==
    "function"
  ) {
    throw new Error(
      "rankOpportunities is not a function"
    );
  }

  return normalizeOpportunities(
    scoringModel.rankOpportunities(
      opportunities,
      context
    )
  );
}


/* =========================================================
   MAIN WORKFLOW
========================================================= */

function generateLifestyleRecommendations(
  context = {}
) {

  console.log(
    "[Lifestyle Recommendation] Starting workflow."
  );


  /* =======================================================
     1. DISCOVERY
  ======================================================= */

  let discoveredOpportunities = [];

  try {

    const discoveryResult =
      discoverOpportunities(
        context
      );

    discoveredOpportunities =
      normalizeOpportunities(
        discoveryResult
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Discovery failed:",
      error.message
    );

    return {
      success: false,

      agent:
        "ride2view-lifestyle-agent",

      context,

      discovery: {
        success: false,
        opportunities: [],
        count: 0,
        error: error.message
      },

      reasoning: {
        success: false,
        enabled: false,
        status: "not_started",
        opportunities: [],
        count: 0
      },

      scoring: {
        success: false,
        opportunities: [],
        count: 0
      },

      ranking: {
        success: false,
        opportunities: [],
        count: 0
      },

      recommendations: [],

      count: 0,

      primary: null,

      budgetAnalysis: {
        requestedBudget:
          context?.budget ??
          context?.userBudget ??
          null,

        hasBudgetConstraint: false,

        alternativesAvailable: false
      },

      summary:
        "Opportunity discovery failed.",

      nextAction: {
        action: "retry_discovery",
        label: "Try the property search again."
      },

      error: error.message,

      timestamp:
        new Date().toISOString()
    };
  }


  console.log(
    `[Lifestyle Recommendation] Discovery complete: ${discoveredOpportunities.length}`
  );


  const discovery = {
    success: true,

    opportunities:
      discoveredOpportunities,

    count:
      discoveredOpportunities.length
  };


  /* =======================================================
     2. REASONING
  ======================================================= */

  let reasoningOpportunities = [];

  try {

    const reasoningResult =
      reasonAboutOpportunities(
        context,
        discoveredOpportunities
      );

    reasoningOpportunities =
      normalizeOpportunities(
        reasoningResult
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Reasoning failed:",
      error.message
    );

    return {
      success: false,

      agent:
        "ride2view-lifestyle-agent",

      context,

      discovery,

      reasoning: {
        success: false,
        enabled: true,
        status: "failed",
        opportunities: [],
        count: 0,
        error: error.message
      },

      scoring: {
        success: false,
        opportunities: [],
        count: 0
      },

      ranking: {
        success: false,
        opportunities: [],
        count: 0
      },

      recommendations: [],

      count: 0,

      primary: null,

      summary:
        "Lifestyle reasoning failed.",

      nextAction: {
        action: "retry_reasoning",
        label: "Try generating the recommendations again."
      },

      error: error.message,

      timestamp:
        new Date().toISOString()
    };
  }


  console.log(
    `[Lifestyle Recommendation] Reasoning complete: ${reasoningOpportunities.length}`
  );


  const reasoning = {
    success: true,

    enabled: true,

    status: "completed",

    opportunities:
      reasoningOpportunities,

    count:
      reasoningOpportunities.length
  };


  /* =======================================================
     3. OPPORTUNITY SCORING
  ======================================================= */

  let scoredOpportunities = [];

  try {

    scoredOpportunities =
      runScoring(
        reasoningOpportunities,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Scoring failed:",
      error.message
    );

    return {
      success: false,

      agent:
        "ride2view-lifestyle-agent",

      context,

      discovery,

      reasoning,

      scoring: {
        success: false,
        opportunities: [],
        count: 0,
        error: error.message
      },

      ranking: {
        success: false,
        opportunities: [],
        count: 0
      },

      recommendations: [],

      count: 0,

      primary: null,

      summary:
        "Opportunity scoring failed.",

      nextAction: {
        action: "retry_scoring",
        label: "Try generating the recommendations again."
      },

      error: error.message,

      timestamp:
        new Date().toISOString()
    };
  }


  console.log(
    `[Lifestyle Recommendation] Scoring complete: ${scoredOpportunities.length}`
  );


  const scoring = {
    success: true,

    opportunities:
      scoredOpportunities,

    count:
      scoredOpportunities.length
  };


  /* =======================================================
     4. RANKING
  ======================================================= */

  let rankedOpportunities = [];

  try {

    rankedOpportunities =
      runRanking(
        scoredOpportunities,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Ranking failed:",
      error.message
    );

    return {
      success: false,

      agent:
        "ride2view-lifestyle-agent",

      context,

      discovery,

      reasoning,

      scoring,

      ranking: {
        success: false,
        opportunities: [],
        count: 0,
        error: error.message
      },

      recommendations: [],

      count: 0,

      primary: null,

      summary:
        "Opportunity ranking failed.",

      nextAction: {
        action: "retry_ranking",
        label: "Try ranking the available opportunities again."
      },

      error: error.message,

      timestamp:
        new Date().toISOString()
    };
  }


  console.log(
    `[Lifestyle Recommendation] Ranking complete: ${rankedOpportunities.length}`
  );


  const ranking = {
    success: true,

    opportunities:
      rankedOpportunities,

    count:
      rankedOpportunities.length
  };


  /* =======================================================
     5. FORMATTING
  ======================================================= */

  let formattedRecommendations = [];

  try {

    const formattingResult =
      formatRecommendations(
        rankedOpportunities,
        context
      );

    formattedRecommendations =
      normalizeRecommendations(
        formattingResult
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error.message
    );

    /*
     * Formatting failure must not destroy the
     * ranked opportunity data.
     */
    formattedRecommendations =
      rankedOpportunities;
  }


  console.log(
    `[Lifestyle Recommendation] Formatting complete: ${formattedRecommendations.length}`
  );


  /* =======================================================
     6. PRIMARY RECOMMENDATION
  ======================================================= */

  const primary =
    formattedRecommendations.length > 0
      ? formattedRecommendations[0]
      : null;


  /* =======================================================
     7. BUDGET ANALYSIS
  ======================================================= */

  const budget =
    context?.budget ??
    context?.userBudget ??
    null;

  const hasBudgetConstraint =
    Number.isFinite(
      Number(budget)
    );


  const budgetAnalysis = {

    requestedBudget:
      budget,

    hasBudgetConstraint,

    alternativesAvailable:
      formattedRecommendations.length > 0

  };


  /* =======================================================
     8. SUMMARY
  ======================================================= */

  const summary =
    formattedRecommendations.length > 0

      ? "Lifestyle recommendations generated successfully."

      : "No suitable lifestyle recommendations were found.";


  /* =======================================================
     9. NEXT ACTION
  ======================================================= */

  let nextAction;


  if (primary) {

    nextAction = {

      action:
        "review_recommendation",

      label:
        "Review the primary recommendation."

    };

  } else {

    nextAction = {

      action:
        "adjust_search",

      label:
        "Adjust the search criteria and try again."

    };

  }


  /* =======================================================
     10. FINAL RESULT
  ======================================================= */

  const result = {

    success: true,

    agent:
      "ride2view-lifestyle-agent",

    context,

    /* -----------------------------------------------
       Stage results
    ----------------------------------------------- */

    discovery,

    reasoning,

    scoring,

    ranking,

    /* -----------------------------------------------
       Final recommendations
    ----------------------------------------------- */

    recommendations:
      formattedRecommendations,

    count:
      formattedRecommendations.length,

    primary,

    /* -----------------------------------------------
       Additional intelligence
    ----------------------------------------------- */

    budgetAnalysis,

    summary,

    nextAction,

    timestamp:
      new Date().toISOString()

  };


  /* =======================================================
     11. FINAL LOG
  ======================================================= */

  console.log(
    "[Lifestyle Recommendation] Workflow complete:",
    {

      discovery:
        result.discovery.count,

      reasoning:
        result.reasoning.count,

      scoring:
        result.scoring.count,

      ranking:
        result.ranking.count,

      formatting:
        result.recommendations.length,

      recommendations:
        result.count

    }
  );


  return result;
}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  generateLifestyleRecommendations

};
