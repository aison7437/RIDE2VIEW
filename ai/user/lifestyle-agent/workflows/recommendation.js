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
 * Individual intelligence models remain delegated to
 * their respective modules.
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

    discoveredOpportunities =
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

      error: error.message
    };
  }


  if (
    !Array.isArray(
      discoveredOpportunities
    )
  ) {
    discoveredOpportunities = [];
  }


  console.log(
    `[Lifestyle Recommendation] Discovery complete: ${discoveredOpportunities.length}`
  );


  const discovery = {
    success: true,
    opportunities: discoveredOpportunities,
    count: discoveredOpportunities.length
  };


  /* =======================================================
     2. REASONING
  ======================================================= */

  let reasoningOpportunities = [];

  try {

    reasoningOpportunities =
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

      error: error.message
    };
  }


  if (
    !Array.isArray(
      reasoningOpportunities
    )
  ) {
    reasoningOpportunities = [];
  }


  console.log(
    `[Lifestyle Recommendation] Reasoning complete: ${reasoningOpportunities.length}`
  );


  const reasoning = {
    success: true,
    enabled: true,
    status: "completed",
    opportunities: reasoningOpportunities,
    count: reasoningOpportunities.length
  };


  /* =======================================================
     3. OPPORTUNITY SCORING
  ======================================================= */

  let scoredOpportunities = [];

  try {

    scoredOpportunities =
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

      error: error.message
    };
  }


  if (
    !Array.isArray(
      scoredOpportunities
    )
  ) {
    scoredOpportunities = [];
  }


  console.log(
    `[Lifestyle Recommendation] Scoring complete: ${scoredOpportunities.length}`
  );


  const scoring = {
    success: true,
    opportunities: scoredOpportunities,
    count: scoredOpportunities.length
  };


  /* =======================================================
     4. RANKING
  ======================================================= */

  let rankedOpportunities = [];

  try {

    /*
     * IMPORTANT:
     *
     * rankOpportunities() scores internally as well.
     * We pass the already-scored opportunities because
     * the scoring model preserves existing valid scores.
     */

    rankedOpportunities =
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

      error: error.message
    };
  }


  if (
    !Array.isArray(
      rankedOpportunities
    )
  ) {
    rankedOpportunities = [];
  }


  console.log(
    `[Lifestyle Recommendation] Ranking complete: ${rankedOpportunities.length}`
  );


  const ranking = {
    success: true,
    opportunities: rankedOpportunities,
    count: rankedOpportunities.length
  };


  /* =======================================================
     5. FORMATTING
  ======================================================= */

  let formattedRecommendations = [];

  try {

    formattedRecommendations =
      formatRecommendations(
        rankedOpportunities,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error.message
    );

    /*
     * Formatting should not destroy the underlying
     * ranked recommendation data.
     */

    formattedRecommendations =
      rankedOpportunities;
  }


  if (
    !Array.isArray(
      formattedRecommendations
    )
  ) {
    formattedRecommendations = [];
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

  const budgetAnalysis = {
    requestedBudget: budget,
    hasBudgetConstraint:
      Number.isFinite(
        Number(budget)
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

    /* Stage results */
    discovery,

    reasoning,

    scoring,

    ranking,

    /* Final recommendations */
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
