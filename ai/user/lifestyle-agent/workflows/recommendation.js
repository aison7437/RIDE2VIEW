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
 * IMPORTANT:
 * The individual modules may return either:
 *
 * 1. An array
 *
 * OR
 *
 * 2. A structured object containing an array
 *
 * This workflow normalizes those return shapes so that
 * one module cannot silently destroy downstream data.
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

const {
  scoreOpportunities,
  rankOpportunities
} = require("../models/opportunity-scoring");

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
 * [
 *   {...},
 *   {...}
 * ]
 *
 * {
 *   opportunities: [...]
 * }
 *
 * {
 *   results: [...]
 * }
 *
 * {
 *   recommendations: [...]
 * }
 *
 * {
 *   properties: [...]
 * }
 *
 * {
 *   mobility: [...]
 * }
 *
 * {
 *   data: [...]
 * }
 *
 * The function deliberately checks several common
 * structured-return conventions.
 */
function normalizeArrayResult(result) {

  if (Array.isArray(result)) {
    return result;
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const possibleArrays = [
    result.opportunities,
    result.results,
    result.recommendations,
    result.properties,
    result.mobility,
    result.data
  ];

  for (const candidate of possibleArrays) {

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}


/**
 * Normalize discovery specifically.
 *
 * Discovery may return:
 *
 * {
 *   opportunities: [...],
 *   properties: [...],
 *   mobility: [...]
 * }
 *
 * If opportunities already exists, use it.
 *
 * Otherwise combine properties and mobility.
 */
function normalizeDiscoveryResult(result) {

  if (Array.isArray(result)) {
    return result;
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  /*
   * Preferred contract.
   */
  if (Array.isArray(result.opportunities)) {
    return result.opportunities;
  }

  /*
   * Some discovery implementations expose
   * properties and mobility separately.
   *
   * Combine them into the single opportunity stream
   * expected by the reasoning layer.
   */
  const properties =
    Array.isArray(result.properties)
      ? result.properties
      : [];

  const mobility =
    Array.isArray(result.mobility)
      ? result.mobility
      : [];

  if (
    properties.length > 0 ||
    mobility.length > 0
  ) {
    return [
      ...properties,
      ...mobility
    ];
  }

  /*
   * Other possible structured contracts.
   */
  return normalizeArrayResult(result);
}


/**
 * Safely normalize downstream module results.
 */
function normalizeStageResult(result) {

  return normalizeArrayResult(result);
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

  let rawDiscoveryResult = null;

  try {

    rawDiscoveryResult =
      discoverOpportunities(
        context
      );

    /*
     * IMPORTANT FIX:
     *
     * Do NOT assume discovery returns an array.
     *
     * The discovery logs prove that it is finding
     * opportunities, while the old workflow was reducing
     * that result to [].
     */
    discoveredOpportunities =
      normalizeDiscoveryResult(
        rawDiscoveryResult
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

    const rawReasoningResult =
      reasonAboutOpportunities(
        context,
        discoveredOpportunities
      );

    reasoningOpportunities =
      normalizeStageResult(
        rawReasoningResult
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

    const rawScoringResult =
      scoreOpportunities(
        reasoningOpportunities,
        context
      );

    scoredOpportunities =
      normalizeStageResult(
        rawScoringResult
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

    const rawRankingResult =
      rankOpportunities(
        scoredOpportunities,
        context
      );

    rankedOpportunities =
      normalizeStageResult(
        rawRankingResult
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
     5. RECOMMENDATION FORMATTING
  ======================================================= */

  let formattedRecommendations = [];

  try {

    const rawFormattingResult =
      formatRecommendations(
        rankedOpportunities,
        context
      );

    formattedRecommendations =
      normalizeStageResult(
        rawFormattingResult
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error.message
    );

    /*
     * Formatting is presentation logic.
     *
     * If formatting fails, preserve the ranked
     * opportunities rather than destroying the
     * recommendation pipeline.
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
     7. SUMMARY
  ======================================================= */

  const summary =
    formattedRecommendations.length > 0

      ? "Lifestyle recommendations generated successfully."

      : "No suitable lifestyle recommendations were found.";


  /* =======================================================
     8. NEXT ACTION
  ======================================================= */

  const nextAction =
    primary

      ? "Review the primary recommendation and proceed with the next available action."

      : "Adjust the search criteria and try again.";


  /* =======================================================
     9. BUDGET ANALYSIS
  ======================================================= */

  const budget =
    context?.budget ??
    context?.userBudget ??
    null;


  const numericBudget =
    Number(budget);


  const budgetAnalysis = {

    requestedBudget:
      budget,

    hasBudgetConstraint:
      Number.isFinite(
        numericBudget
      ),

    alternativesAvailable:
      formattedRecommendations.length > 0

  };


  /* =======================================================
     10. FINAL RESULT
  ======================================================= */

  const result = {

    success: true,

    agent:
      "ride2view-lifestyle-agent",

    context,

    /*
     * Full pipeline results.
     */
    discovery,

    reasoning,

    scoring,

    ranking,

    /*
     * Final user-facing recommendations.
     */
    recommendations:
      formattedRecommendations,

    count:
      formattedRecommendations.length,

    primary,

    budgetAnalysis,

    summary,

    nextAction,

    timestamp:
      new Date().toISOString()

  };


  /* =======================================================
     11. WORKFLOW DIAGNOSTICS
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
