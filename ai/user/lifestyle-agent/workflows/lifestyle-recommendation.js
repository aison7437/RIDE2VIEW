/**
 * Ride2View Lifestyle Agent
 * Lifestyle Recommendation Workflow
 *
 * Pipeline:
 *
 * Location Context
 *       ↓
 * Opportunity Discovery
 *       ↓
 * Reasoning Engine
 *       ↓
 * Opportunity Scoring
 *       ↓
 * Ranked Recommendations
 *       ↓
 * Recommendation Formatter
 *
 * This workflow does not directly execute:
 * payments, bookings, purchases,
 * or other consequential actions.
 */

const {
  getLocationContext
} = require("../tools/location");

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");

const {
  reasonAboutOpportunities
} = require("../reasoning/reasoning-engine");

const {
  rankOpportunities
} = require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/**
 * Generate lifestyle recommendations.
 *
 * @param {Object} input
 * @returns {Object}
 */
async function generateLifestyleRecommendations(input = {}) {

  const {
    user = {},
    context = {}
  } = input;


  // -----------------------------------------
  // 1. Normalize location
  // -----------------------------------------

  const location = getLocationContext(
    context.location || {}
  );


  // -----------------------------------------
  // 2. Build unified agent context
  // -----------------------------------------

  const agentContext = {

    user,

    userGoal:
      context.userGoal || null,

    goal:
      context.userGoal || null,

    location,

    budget:
      context.budget ?? null,

    availableTime:
      context.availableTime ?? null,

    currentActivity:
      context.currentActivity || null,

    destination:
      context.destination || null
  };


  // -----------------------------------------
  // 3. Discover opportunities
  // -----------------------------------------

  const discoveryResult =
    discoverOpportunities(agentContext);


  const opportunities =
    Array.isArray(discoveryResult?.opportunities)
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Reason about opportunities
  // -----------------------------------------

  const rawReasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // Make sure reasoning is always an array.

  const reasoningResult =
    Array.isArray(rawReasoningResult)
      ? rawReasoningResult
      : [];


  // -----------------------------------------
  // 5. Attach reasoning signals
  // -----------------------------------------

  const reasonedOpportunities =
    opportunities.map((opportunity) => {

      const reasoning =
        reasoningResult.find((item) => {

          return (
            item &&
            (
              item.opportunity === opportunity ||
              item.id === opportunity.id
            )
          );

        });


      return {

        ...opportunity,

        reasoningScore:
          Number(
            reasoning?.reasoningScore
          ) || 0,

        reasoningFactors:
          Array.isArray(
            reasoning?.factors
          )
            ? reasoning.factors
            : []
      };

    });


  // -----------------------------------------
  // 6. Score and rank opportunities
  // -----------------------------------------

  const rankedOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // -----------------------------------------
  // 7. Format recommendations
  // -----------------------------------------

  const formattedRecommendations =
    formatRecommendations(
      rankedOpportunities,
      agentContext
    );


  // -----------------------------------------
  // 8. Return structured result
  // -----------------------------------------

  return {

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context:
      agentContext,

    discovery: {

      success:
        discoveryResult?.success ?? false,

      count:
        opportunities.length
    },

    reasoning: {

      enabled: true,

      count:
        reasoningResult.length
    },

    ranking: {

      count:
        Array.isArray(rankedOpportunities)
          ? rankedOpportunities.length
          : 0
    },

    recommendations:
      Array.isArray(formattedRecommendations)
        ? formattedRecommendations
        : [],

    timestamp:
      new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};  const agentContext = {

    user,

    userGoal:
      context.userGoal || null,

    goal:
      context.userGoal || null,

    location,

    budget:
      context.budget ?? null,

    availableTime:
      context.availableTime ?? null,

    currentActivity:
      context.currentActivity || null,

    destination:
      context.destination || null
  };


  // -----------------------------------------
  // 3. Discover opportunities
  // -----------------------------------------

  const discoveryResult =
    discoverOpportunities(agentContext);


  const opportunities =
    Array.isArray(discoveryResult?.opportunities)
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Reason about opportunities
  // -----------------------------------------

  const rawReasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // Make sure reasoning is always an array.

  const reasoningResult =
    Array.isArray(rawReasoningResult)
      ? rawReasoningResult
      : [];


  // -----------------------------------------
  // 5. Attach reasoning signals
  // -----------------------------------------

  const reasonedOpportunities =
    opportunities.map((opportunity) => {

      const reasoning =
        reasoningResult.find((item) => {

          return (
            item &&
            (
              item.opportunity === opportunity ||
              item.id === opportunity.id
            )
          );

        });


      return {

        ...opportunity,

        reasoningScore:
          Number(
            reasoning?.reasoningScore
          ) || 0,

        reasoningFactors:
          Array.isArray(
            reasoning?.factors
          )
            ? reasoning.factors
            : []
      };

    });


  // -----------------------------------------
  // 6. Score and rank opportunities
  // -----------------------------------------

  const rankedOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // -----------------------------------------
  // 7. Return structured result
  // -----------------------------------------

  return {

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context:
      agentContext,

    discovery: {

      success:
        discoveryResult?.success ?? false,

      count:
        opportunities.length
    },

    reasoning: {

      enabled: true,

      count:
        reasoningResult.length
    },

    ranking: {

      count:
        Array.isArray(rankedOpportunities)
          ? rankedOpportunities.length
          : 0
    },

    recommendations:
      Array.isArray(rankedOpportunities)
        ? rankedOpportunities
        : [],

    timestamp:
      new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};
