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
 * This file is the orchestration layer.
 *
 * IMPORTANT:
 * Discovery and downstream modules may return either:
 *
 *   - arrays
 *   - objects containing arrays
 *   - nested structured results
 *
 * This workflow normalizes those results without silently
 * converting valid discovered opportunities into [].
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
   UTILITY: OBJECT CHECK
========================================================= */

function isObject(value) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


/* =========================================================
   UTILITY: OPPORTUNITY-LIKE OBJECT
========================================================= */

/**
 * Determines whether an object looks like an opportunity.
 *
 * We deliberately keep this permissive because different
 * discovery modules may use different field names.
 */
function looksLikeOpportunity(value) {

  if (!isObject(value)) {
    return false;
  }

  const keys =
    Object.keys(value).map(
      key => key.toLowerCase()
    );


  const indicators = [

    "id",
    "title",
    "name",
    "type",
    "category",
    "location",
    "neighborhood",
    "price",
    "rent",
    "cost",
    "bedrooms",
    "property",
    "propertytype",
    "mobility",
    "service",
    "transport",
    "description"

  ];


  return indicators.some(
    indicator =>
      keys.includes(indicator)
  );

}


/* =========================================================
   UTILITY: FIND OPPORTUNITY ARRAY
========================================================= */

/**
 * Recursively searches a structured result for the most
 * useful array of opportunity objects.
 *
 * This handles structures such as:
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
 *   result: {
 *     properties: [...]
 *   }
 * }
 *
 * {
 *   data: {
 *     results: [...]
 *   }
 * }
 *
 * {
 *   discovery: {
 *     properties: [...],
 *     mobility: [...]
 *   }
 * }
 *
 * The previous implementation only checked a few top-level
 * fields. This version searches nested structures as well.
 */
function extractOpportunityArray(value) {

  if (Array.isArray(value)) {

    /*
     * Empty array is technically valid, but continue
     * searching elsewhere when possible.
     */
    if (value.length === 0) {
      return [];
    }


    /*
     * If the array contains opportunity-like objects,
     * use it directly.
     */
    const opportunityObjects =
      value.filter(
        item =>
          looksLikeOpportunity(item)
      );


    if (opportunityObjects.length > 0) {
      return value;
    }


    /*
     * Sometimes an array itself contains structured
     * containers. Search inside them.
     */
    for (const item of value) {

      const nested =
        extractOpportunityArray(item);

      if (nested.length > 0) {
        return nested;
      }

    }


    return [];
  }


  if (!isObject(value)) {
    return [];
  }


  /*
   * Preferred semantic keys.
   *
   * Search these first because they are most likely to
   * contain actual opportunities rather than metadata.
   */
  const preferredKeys = [

    "opportunities",
    "results",
    "recommendations",
    "properties",
    "propertyOpportunities",
    "mobility",
    "mobilityOpportunities",
    "items",
    "data",
    "result",
    "discovery"

  ];


  for (const key of preferredKeys) {

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        key
      )
    ) {

      const nested =
        extractOpportunityArray(
          value[key]
        );

      if (nested.length > 0) {
        return nested;
      }

    }

  }


  /*
   * If no known semantic key worked, recursively inspect
   * every object property.
   */
  for (const key of Object.keys(value)) {

    const nestedValue =
      value[key];


    if (
      nestedValue &&
      typeof nestedValue === "object"
    ) {

      const nested =
        extractOpportunityArray(
          nestedValue
        );

      if (nested.length > 0) {
        return nested;
      }

    }

  }


  return [];
}


/* =========================================================
   DISCOVERY NORMALIZATION
========================================================= */

/**
 * Discovery is special because the discovery module may
 * expose properties and mobility as separate collections.
 *
 * If both exist, combine them.
 */
function normalizeDiscoveryResult(result) {

  /*
   * Direct array.
   */
  if (Array.isArray(result)) {
    return result;
  }


  if (!isObject(result)) {
    return [];
  }


  /*
   * Direct opportunities collection.
   */
  if (
    Array.isArray(
      result.opportunities
    )
  ) {

    return result.opportunities;

  }


  /*
   * Direct properties + mobility collections.
   */
  const properties =
    Array.isArray(
      result.properties
    )
      ? result.properties
      : [];


  const mobility =
    Array.isArray(
      result.mobility
    )
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
   * Other possible names.
   */
  const propertyOpportunities =
    Array.isArray(
      result.propertyOpportunities
    )
      ? result.propertyOpportunities
      : [];


  const mobilityOpportunities =
    Array.isArray(
      result.mobilityOpportunities
    )
      ? result.mobilityOpportunities
      : [];


  if (
    propertyOpportunities.length > 0 ||
    mobilityOpportunities.length > 0
  ) {

    return [
      ...propertyOpportunities,
      ...mobilityOpportunities
    ];

  }


  /*
   * Recursive fallback.
   */
  return extractOpportunityArray(
    result
  );

}


/* =========================================================
   GENERIC STAGE NORMALIZATION
========================================================= */

function normalizeStageResult(result) {

  if (Array.isArray(result)) {
    return result;
  }


  return extractOpportunityArray(
    result
  );

}


/* =========================================================
   NEXT ACTION
========================================================= */

/**
 * The test suite requires:
 *
 * nextAction.action -> string
 * nextAction.label  -> string
 *
 * Therefore nextAction is always an object.
 */
function buildNextAction(
  primary,
  recommendationCount
) {

  if (
    primary &&
    recommendationCount > 0
  ) {

    return {

      action:
        "review_primary_recommendation",

      label:
        "Review primary recommendation"

    };

  }


  return {

    action:
      "adjust_search_criteria",

    label:
      "Adjust search criteria and try again"

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

  let discoveredOpportunities = [];


  try {

    const rawDiscoveryResult =
      discoverOpportunities(
        context
      );


    /*
     * CRITICAL:
     *
     * Do not discard structured discovery results.
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

        error:
          error.message

      },

      reasoning: {

        success: false,

        enabled: false,

        status:
          "not_started",

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
        "Lifestyle opportunity discovery failed.",

      nextAction:
        buildNextAction(
          null,
          0
        ),

      error:
        error.message,

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

        status:
          "failed",

        opportunities: [],

        count: 0,

        error:
          error.message

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

        alternativesAvailable:
          false

      },

      summary:
        "Lifestyle reasoning failed.",

      nextAction:
        buildNextAction(
          null,
          0
        ),

      error:
        error.message,

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

        error:
          error.message

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

        alternativesAvailable:
          false

      },

      summary:
        "Opportunity scoring failed.",

      nextAction:
        buildNextAction(
          null,
          0
        ),

      error:
        error.message,

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

        error:
          error.message

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

        alternativesAvailable:
          false

      },

      summary:
        "Opportunity ranking failed.",

      nextAction:
        buildNextAction(
          null,
          0
        ),

      error:
        error.message,

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
     * Formatting should never erase valid ranked data.
     */
    formattedRecommendations =
      rankedOpportunities;

  }


  /*
   * Final safety fallback.
   */
  if (
    formattedRecommendations.length === 0 &&
    rankedOpportunities.length > 0
  ) {

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
    buildNextAction(
      primary,
      formattedRecommendations.length
    );


  /* =======================================================
     9. BUDGET ANALYSIS
  ======================================================= */

  const requestedBudget =
    context?.budget ??
    context?.userBudget ??
    null;


  const numericBudget =
    Number(
      requestedBudget
    );


  const budgetAnalysis = {

    requestedBudget,

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


  /* =======================================================
     11. DIAGNOSTIC LOG
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
