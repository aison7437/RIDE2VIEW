/**
 * RIDE2VIEW Lifestyle Agent
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
 * IMPORTANT:
 * discoverOpportunities() is asynchronous.
 * The workflow MUST await it before normalization.
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
   OBJECT CHECK
========================================================= */

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


/* =========================================================
   OPPORTUNITY CHECK
========================================================= */

function looksLikeOpportunity(value) {
  if (!isObject(value)) {
    return false;
  }

  const keys = Object.keys(value).map(
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
    indicator => keys.includes(indicator)
  );
}


/* =========================================================
   EXTRACT OPPORTUNITIES
========================================================= */

function extractOpportunityArray(value) {

  if (Array.isArray(value)) {

    if (value.length === 0) {
      return [];
    }

    const opportunities = value.filter(
      item => looksLikeOpportunity(item)
    );

    if (opportunities.length > 0) {
      return value;
    }

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


  for (const key of Object.keys(value)) {

    const nestedValue = value[key];

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

function normalizeDiscoveryResult(result) {

  if (Array.isArray(result)) {
    return result;
  }

  if (!isObject(result)) {
    return [];
  }


  if (Array.isArray(result.opportunities)) {
    return result.opportunities;
  }


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


  return extractOpportunityArray(result);
}


/* =========================================================
   GENERIC STAGE NORMALIZATION
========================================================= */

function normalizeStageResult(result) {

  if (Array.isArray(result)) {
    return result;
  }

  return extractOpportunityArray(result);
}


/* =========================================================
   NEXT ACTION
========================================================= */

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

async function generateLifestyleRecommendations(
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

    /*
     * CRITICAL FIX:
     *
     * discoverOpportunities() returns a Promise.
     * We MUST await it.
     */
    const rawDiscoveryResult =
      await discoverOpportunities(
        context
      );


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

      summary:
        "Lifestyle opportunity discovery failed.",

      nextAction:
        buildNextAction(null, 0),

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

      nextAction:
        buildNextAction(null, 0),

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

      nextAction:
        buildNextAction(null, 0),

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
        error: error.message
      },

      recommendations: [],

      count: 0,

      primary: null,

      summary:
        "Opportunity ranking failed.",

      nextAction:
        buildNextAction(null, 0),

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

    const rawRecommendations =
      formatRecommendations(
        rankedOpportunities,
        context
      );


    formattedRecommendations =
      normalizeStageResult(
        rawRecommendations
      );


  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
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

      ranking,

      recommendations: [],

      count: 0,

      primary: null,

      summary:
        "Recommendation formatting failed.",

      nextAction:
        buildNextAction(null, 0),

      error:
        error.message,

      timestamp:
        new Date().toISOString()
    };
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
    Number(requestedBudget);


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
