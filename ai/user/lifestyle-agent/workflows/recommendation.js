/**
 * Ride2View Lifestyle Agent
 *
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * User Request
 *      ↓
 * Context
 *      ↓
 * Opportunity Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Utility Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendations
 */


/*
 * ==========================================
 * IMPORT TOOLS
 * ==========================================
 */

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");


const {
  buildReasoning
} = require("../reasoning/reasoning-engine");


const {
  evaluateUtility,
  rankByUtility
} = require("../models/utility-scoring");


/*
 * ==========================================
 * SAFE ARRAY
 * ==========================================
 */

function safeArray(value) {

  return Array.isArray(value)
    ? value
    : [];

}


/*
 * ==========================================
 * NORMALIZE DISCOVERY RESULT
 * ==========================================
 */

function normalizeDiscoveryResult(result) {

  if (Array.isArray(result)) {

    return {
      success: true,
      opportunities: result
    };

  }


  if (!result || typeof result !== "object") {

    return {
      success: false,
      opportunities: []
    };

  }


  const opportunities =
    result.opportunities ||
    result.results ||
    result.data ||
    result.items ||
    [];


  return {

    ...result,

    success:
      result.success !== false,

    opportunities:
      safeArray(opportunities)

  };

}


/*
 * ==========================================
 * NORMALIZE REASONING RESULT
 * ==========================================
 */

function normalizeReasoningResult(
  result,
  opportunities
) {

  if (Array.isArray(result)) {

    return {

      enabled: true,

      opportunities: result

    };

  }


  if (!result || typeof result !== "object") {

    return {

      enabled: false,

      opportunities

    };

  }


  const reasoningOpportunities =
    result.opportunities ||
    result.results ||
    result.data ||
    result.items;


  return {

    ...result,

    enabled:
      result.enabled !== false,

    opportunities:
      Array.isArray(
        reasoningOpportunities
      )
        ? reasoningOpportunities
        : opportunities

  };

}


/*
 * ==========================================
 * BUILD CONTEXT
 * ==========================================
 */

function buildWorkflowContext(
  workflowInput = {}
) {

  const context =
    workflowInput.context ||
    {};


  const user =
    workflowInput.user ||
    context.user ||
    {};


  const request =
    context.request ||
    workflowInput.request ||
    {};


  return {

    ...context,

    user,

    request,

    userGoal:
      context.userGoal ||
      context.goal ||
      "general",

    goal:
      context.goal ||
      context.userGoal ||
      "general",

    location:
      context.location ||
      null,

    budget:
      context.budget ??
      null,

    availableTime:
      context.availableTime ||
      null,

    currentActivity:
      context.currentActivity ||
      null,

    destination:
      context.destination ||
      null

  };

}


/*
 * ==========================================
 * DISCOVERY
 * ==========================================
 */

async function runDiscovery(
  context
) {

  try {

    /*
     * Try the standard object input first.
     */

    const result =
      await discoverOpportunities(
        context
      );


    return normalizeDiscoveryResult(
      result
    );

  } catch (error) {

    /*
     * Keep the workflow alive.
     * The failure is explicitly exposed.
     */

    return {

      success: false,

      count: 0,

      opportunities: [],

      error:
        error.message

    };

  }

}


/*
 * ==========================================
 * REASONING
 * ==========================================
 */

async function runReasoning(
  opportunities,
  context
) {

  const items =
    safeArray(
      opportunities
    );


  if (
    items.length === 0
  ) {

    return {

      enabled: false,

      count: 0,

      opportunities: []

    };

  }


  try {

    const result =
      await buildReasoning(
        items,
        context
      );


    return normalizeReasoningResult(
      result,
      items
    );

  } catch (error) {

    /*
     * If reasoning fails, retain discovery
     * opportunities rather than destroying them.
     */

    return {

      enabled: false,

      count: items.length,

      opportunities: items,

      error:
        error.message

    };

  }

}


/*
 * ==========================================
 * APPLY UTILITY SCORING
 * ==========================================
 */

function applyUtilityScoring(
  opportunities,
  context
) {

  const items =
    safeArray(
      opportunities
    );


  return items.map(
    opportunity => {

      try {

        return evaluateUtility(
          opportunity,
          context
        );

      } catch (error) {

        return {

          ...opportunity,

          utilityScore: 0,

          utilityLevel: "poor",

          utilityError:
            error.message

        };

      }

    }
  );

}


/*
 * ==========================================
 * RANK OPPORTUNITIES
 * ==========================================
 */

function rankOpportunities(
  opportunities,
  context
) {

  const items =
    safeArray(
      opportunities
    );


  if (
    items.length === 0
  ) {

    return [];

  }


  try {

    return rankByUtility(
      items,
      context
    );

  } catch (error) {

    /*
     * Safe fallback ranking.
     */

    return [...items].sort(
      (a, b) => {

        const scoreA =
          Number(
            a.utilityScore ??
            a.score ??
            0
          );

        const scoreB =
          Number(
            b.utilityScore ??
            b.score ??
            0
          );


        return scoreB - scoreA;

      }
    );

  }

}


/*
 * ==========================================
 * BUILD RECOMMENDATION
 * ==========================================
 */

function buildRecommendations(
  ranked,
  context
) {

  const items =
    safeArray(
      ranked
    );


  if (
    items.length === 0
  ) {

    return {

      count: 0,

      primary: null,

      alternatives: [],

      recommendations: [],

      nextAction: {

        action: "none",

        label:
          "No recommendation available"

      }

    };

  }


  /*
   * Assign deterministic ranks.
   */

  const recommendations =
    items.map(
      (item, index) => ({

        ...item,

        rank:
          index + 1

      })
    );


  const primary =
    recommendations[0];


  const alternatives =
    recommendations.slice(1);


  let nextAction = {

    action: "view-property",

    label: "View property"

  };


  if (
    primary.type === "mobility" ||
    primary.category === "mobility" ||
    primary.service === "ride"
  ) {

    nextAction = {

      action: "book-ride",

      label: "Book ride"

    };

  }


  return {

    count:
      recommendations.length,

    primary,

    alternatives,

    recommendations,

    nextAction

  };

}


/*
 * ==========================================
 * BUILD SUMMARY
 * ==========================================
 */

function buildSummary(
  recommendations
) {

  const items =
    safeArray(
      recommendations
    );


  return {

    total:
      items.length,

    strongMatches:
      items.filter(
        item =>
          Number(
            item.matchPercentage ??
            0
          ) >= 90
      ).length,

    excellentUtility:
      items.filter(
        item =>
          item.utilityLevel ===
          "excellent"
      ).length,

    highUtility:
      items.filter(
        item =>
          item.utilityLevel ===
          "high"
      ).length,

    moderateUtility:
      items.filter(
        item =>
          item.utilityLevel ===
          "moderate"
      ).length,

    alternatives:
      Math.max(
        items.length - 1,
        0
      )

  };

}


/*
 * ==========================================
 * MAIN WORKFLOW
 * ==========================================
 */

async function generateLifestyleRecommendations(
  workflowInput = {}
) {

  const context =
    buildWorkflowContext(
      workflowInput
    );


  /*
   * ========================================
   * STEP 1 — DISCOVERY
   * ========================================
   */

  const discovery =
    await runDiscovery(
      context
    );


  let opportunities =
    safeArray(
      discovery.opportunities
    );


  /*
   * ========================================
   * STEP 2 — REASONING
   * ========================================
   */

  const reasoning =
    await runReasoning(
      opportunities,
      context
    );


  opportunities =
    safeArray(
      reasoning.opportunities
    );


  /*
   * ========================================
   * STEP 3 — UTILITY SCORING
   * ========================================
   */

  const scored =
    applyUtilityScoring(
      opportunities,
      context
    );


  /*
   * ========================================
   * STEP 4 — RANKING
   * ========================================
   */

  const ranking =
    rankOpportunities(
      scored,
      context
    );


  /*
   * ========================================
   * STEP 5 — RECOMMENDATION
   * ========================================
   */

  const result =
    buildRecommendations(
      ranking,
      context
    );


  /*
   * ========================================
   * FINAL RESULT
   * ========================================
   */

  return {

    success: true,

    context,

    discovery: {

      success:
        discovery.success,

      count:
        opportunities.length

    },

    reasoning: {

      enabled:
        reasoning.enabled,

      count:
        opportunities.length

    },

    ranking: {

      count:
        ranking.length

    },

    count:
      result.count,

    primary:
      result.primary,

    alternatives:
      result.alternatives,

    recommendations:
      result.recommendations,

    nextAction:
      result.nextAction,

    summary:
      buildSummary(
        result.recommendations
      ),

    timestamp:
      new Date().toISOString()

  };

}


/*
 * ==========================================
 * EXPORTS
 * ==========================================
 */

module.exports = {

  generateLifestyleRecommendations,

  buildWorkflowContext,

  runDiscovery,

  runReasoning,

  applyUtilityScoring,

  rankOpportunities,

  buildRecommendations,

  buildSummary

};
