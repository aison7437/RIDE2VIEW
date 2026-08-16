/**
 * Ride2View Lifestyle Agent
 * Lifestyle Recommendation Workflow
 *
 * Purpose:
 * Orchestrates:
 * location context,
 * opportunity discovery,
 * reasoning,
 * scoring,
 * ranking,
 * and recommendation formatting
 * into structured lifestyle recommendations.
 *
 * This workflow does not directly execute payments,
 * bookings, purchases, or other consequential actions.
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
} = require("../Recommendation/recommendation-formatter");


/**
 * Generate lifestyle recommendations.
 *
 * @param {Object} input - Workflow input
 * @returns {Object} Structured recommendation result
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
    Array.isArray(
      discoveryResult?.opportunities
    )
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Reason about opportunities
  // -----------------------------------------

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // -----------------------------------------
  // 5. Attach reasoning signals
  // -----------------------------------------

  const reasonedOpportunities =
    opportunities.map((opportunity) => {

      const reasoning =
        reasoningResult.find(
          (item) =>
            item.opportunity === opportunity
        );

      return {
        ...opportunity,

        reasoningScore:
          reasoning?.reasoningScore ?? 0,

        reasoningFactors:
          reasoning?.factors ?? []
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

  const recommendations =
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
        rankedOpportunities.length
    },

    recommendations,

    timestamp:
      new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};    userGoal:
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
    Array.isArray(
      discoveryResult?.opportunities
    )
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Reason about opportunities
  // -----------------------------------------

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // -----------------------------------------
  // 5. Attach reasoning signals
  //    to discovered opportunities
  // -----------------------------------------

  const reasonedOpportunities =
    opportunities.map((opportunity) => {

      const reasoning =
        reasoningResult.find(
          (item) =>
            item.opportunity === opportunity
        );

      return {
        ...opportunity,

        reasoningScore:
          reasoning?.reasoningScore ?? 0,

        reasoningFactors:
          reasoning?.factors ?? []
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

    recommendations:
      rankedOpportunities,

    timestamp:
      new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};
