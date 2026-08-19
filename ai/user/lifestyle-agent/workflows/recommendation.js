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
 * This workflow orchestrates the complete lifestyle
 * recommendation pipeline.
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
  scoreOpportunities
} = require("../models/opportunity-scoring");

const {
  rankOpportunities
} = require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/* =========================================================
   HELPERS
========================================================= */

/**
 * Normalize a workflow-stage result into an array.
 *
 * Different modules may return either:
 *
 * [
 *   opportunity,
 *   opportunity
 * ]
 *
 * OR:
 *
 * {
 *   success: true,
 *   opportunities: [
 *     opportunity,
 *     opportunity
 *   ],
 *   count: 2
 * }
 *
 * This helper allows the orchestration layer to support
 * both contracts without destroying valid data.
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
    Array.isArray(result.items)
  ) {
    return result.items;
  }

  return [];
}


/**
 * Preserve the structured stage result when available.
 */

function normalizeStage(
  result,
  opportunities,
  defaults = {}
) {

  const source =
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
      ? result
      : {};

  return {
    ...defaults,
    ...source,

    success:
      typeof source.success === "boolean"
        ? source.success
        : true,

    opportunities,

    count:
      opportunities.length
  };
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

  let discoveryResult;

  try {

    discoveryResult =
      discoverOpportunities(
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Discovery failed:",
      error.message
    );

    return {
      success: false,

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

      nextAction: {
        action: "adjust_search",
        label: "Adjust search criteria"
      },

      error: error.message
    };
  }


  const discoveredOpportunities =
    normalizeOpportunities(
      discoveryResult
    );


  console.log(
    `[Lifestyle Recommendation] Discovery complete: ${discoveredOpportunities.length}`
  );


  const discovery =
    normalizeStage(
      discoveryResult,
      discoveredOpportunities,
      {
        success: true
      }
    );


  /* =======================================================
     2. REASONING
  ======================================================= */

  let reasoningResult;

  try {

    reasoningResult =
      reasonAboutOpportunities(
        context,
        discoveredOpportunities
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Reasoning failed:",
      error.message
    );

    return {
      success: false,

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

      nextAction: {
        action: "adjust_search",
        label: "Adjust search criteria"
      },

      error: error.message
    };
  }


  const reasoningOpportunities =
    normalizeOpportunities(
      reasoningResult
    );


  console.log(
    `[Lifestyle Recommendation] Reasoning complete: ${reasoningOpportunities.length}`
  );


  const reasoning =
    normalizeStage(
      reasoningResult,
      reasoningOpportunities,
      {
        success: true,
        enabled: true,
        status: "completed"
      }
    );


  /* =======================================================
     3. OPPORTUNITY SCORING
  ======================================================= */

  let scoringResult;

  try {

    scoringResult =
      scoreOpportunities(
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

      nextAction: {
        action: "adjust_search",
        label: "Adjust search criteria"
      },

      error: error.message
    };
  }


  const scoredOpportunities =
    normalizeOpportunities(
      scoringResult
    );


  console.log(
    `[Lifestyle Recommendation] Scoring complete: ${scoredOpportunities.length}`
  );


  const scoring =
    normalizeStage(
      scoringResult,
      scoredOpportunities,
      {
        success: true
      }
    );


  /* =======================================================
     4. RANKING
  ======================================================= */

  let rankingResult;

  try {

    rankingResult =
      rankOpportunities(
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

      nextAction: {
        action: "adjust_search",
        label: "Adjust search criteria"
      },

      error: error.message
    };
  }


  const rankedOpportunities =
    normalizeOpportunities(
      rankingResult
    );


  console.log(
    `[Lifestyle Recommendation] Ranking complete: ${rankedOpportunities.length}`
  );


  const ranking =
    normalizeStage(
      rankingResult,
      rankedOpportunities,
      {
        success: true
      }
    );


  /* =======================================================
     5. FORMATTING
  ======================================================= */

  let formattingResult;

  try {

    formattingResult =
      formatRecommendations(
        rankedOpportunities,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error.message
    );

    formattingResult =
      rankedOpportunities;
  }


  const formattedRecommendations =
    normalizeOpportunities(
      formattingResult
    );


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
      ? {
          action: "review_recommendation",
          label: "Review primary recommendation"
        }
      : {
          action: "adjust_search",
          label: "Adjust search criteria"
        };


  /* =======================================================
     9. BUDGET ANALYSIS
  ======================================================= */

  const budget =
    context?.budget ??
    context?.userBudget ??
    null;


  const numericBudget =
    Number(budget);


  const hasBudgetConstraint =
    Number.isFinite(
      numericBudget
    );


  /*
   * Determine whether the returned recommendations
   * contain priced alternatives.
   */

  const pricedRecommendations =
    formattedRecommendations.filter(
      opportunity => {

        const price =
          Number(
            opportunity?.price
          );

        return Number.isFinite(price);
      }
    );


  const budgetAnalysis = {

    requestedBudget:
      budget,

    hasBudgetConstraint,

    alternativesAvailable:
      pricedRecommendations.length > 0,

    pricedAlternatives:
      pricedRecommendations.length,

    budgetExceeded:
      hasBudgetConstraint &&
      pricedRecommendations.length > 0 &&
      pricedRecommendations.every(
        opportunity =>
          Number(opportunity.price) >
          numericBudget
      )
  };


  /* =======================================================
     10. FINAL RESULT
  ======================================================= */

  const result = {

    success: true,

    agent:
      "ride2view-lifestyle-agent",

    context,

    discovery,

    reasoning,

    scoring,

    ranking,

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
