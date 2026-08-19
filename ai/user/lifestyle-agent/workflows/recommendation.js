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
  scoreOpportunities,
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

    const discoveryResult =
      discoverOpportunities(
        context
      );


    /*
     * Discovery may return either:
     *
     * A. An array:
     *
     * [
     *   opportunity,
     *   opportunity
     * ]
     *
     * OR
     *
     * B. A structured object:
     *
     * {
     *   properties: [...],
     *   mobility: [...]
     * }
     *
     * OR
     *
     * C. A structured object containing:
     *
     * {
     *   opportunities: [...]
     * }
     *
     * Normalize all supported forms into one
     * opportunity array for downstream stages.
     */

    if (
      Array.isArray(
        discoveryResult
      )
    ) {

      discoveredOpportunities =
        discoveryResult;

    } else if (
      discoveryResult &&
      typeof discoveryResult === "object"
    ) {

      const explicitOpportunities =
        Array.isArray(
          discoveryResult.opportunities
        )
          ? discoveryResult.opportunities
          : [];


      const properties =
        Array.isArray(
          discoveryResult.properties
        )
          ? discoveryResult.properties
          : [];


      const mobility =
        Array.isArray(
          discoveryResult.mobility
        )
          ? discoveryResult.mobility
          : [];


      /*
       * Prefer an explicit opportunities array.
       */

      if (
        explicitOpportunities.length > 0
      ) {

        discoveredOpportunities =
          explicitOpportunities;

      } else {

        /*
         * Otherwise combine all discovered
         * property and mobility opportunities.
         */

        discoveredOpportunities = [
          ...properties,
          ...mobility
        ];

      }

    }

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
        "Lifestyle discovery failed.",

      nextAction: {
        action: "retry_discovery",
        label: "Try the search again."
      },

      error:
        error.message,

      timestamp:
        new Date().toISOString()
    };

  }


  /*
   * Final safety normalization.
   */

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

      budgetAnalysis: {
        requestedBudget:
          context?.budget ??
          context?.userBudget ??
          null,

        hasBudgetConstraint:
          Number.isFinite(
            Number(
              context?.budget ??
              context?.userBudget
            )
          ),

        alternativesAvailable: false
      },

      summary:
        "Lifestyle reasoning failed.",

      nextAction: {
        action: "retry_reasoning",
        label: "Try the search again."
      },

      error:
        error.message,

      timestamp:
        new Date().toISOString()
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

    status:
      "completed",

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

      budgetAnalysis: {
        requestedBudget:
          context?.budget ??
          context?.userBudget ??
          null,

        hasBudgetConstraint:
          Number.isFinite(
            Number(
              context?.budget ??
              context?.userBudget
            )
          ),

        alternativesAvailable: false
      },

      summary:
        "Lifestyle opportunity scoring failed.",

      nextAction: {
        action: "retry_scoring",
        label: "Try the search again."
      },

      error:
        error.message,

      timestamp:
        new Date().toISOString()
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

      budgetAnalysis: {
        requestedBudget:
          context?.budget ??
          context?.userBudget ??
          null,

        hasBudgetConstraint:
          Number.isFinite(
            Number(
              context?.budget ??
              context?.userBudget
            )
          ),

        alternativesAvailable: false
      },

      summary:
        "Lifestyle opportunity ranking failed.",

      nextAction: {
        action: "retry_ranking",
        label: "Try the search again."
      },

      error:
        error.message,

      timestamp:
        new Date().toISOString()
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
     * ranked opportunity data.
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

  /*
   * nextAction must be an object because the test suite
   * expects:
   *
   * nextAction.action -> string
   * nextAction.label  -> string
   */

  const nextAction =
    primary
      ? {
          action:
            "review_recommendation",

          label:
            "Review the primary recommendation and proceed."
        }

      : {
          action:
            "adjust_search",

          label:
            "Adjust the search criteria and try again."
        };


  /* =======================================================
     9. BUDGET ANALYSIS
  ======================================================= */

  const budget =
    context?.budget ??
    context?.userBudget ??
    null;


  const hasBudgetConstraint =
    Number.isFinite(
      Number(
        budget
      )
    );


  const budgetAnalysis = {

    requestedBudget:
      budget,

    hasBudgetConstraint,

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
     * Stage results
     */

    discovery,

    reasoning,

    scoring,

    ranking,

    /*
     * Final recommendations
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
     11. WORKFLOW LOG
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
