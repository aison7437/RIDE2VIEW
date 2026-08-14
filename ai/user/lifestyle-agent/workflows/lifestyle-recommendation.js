/**
 * Ride2View Lifestyle Agent
 * Lifestyle Recommendation Workflow
 *
 * Purpose:
 * Orchestrates location context, opportunity discovery,
 * and opportunity scoring into ranked recommendations.
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
  rankOpportunities
} = require("../models/opportunity-scoring");


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
  // 2. Build discovery context
  // -----------------------------------------

  const discoveryContext = {
    userGoal: context.userGoal || null,
    location,
    budget: context.budget ?? null,
    availableTime: context.availableTime ?? null
  };


  // -----------------------------------------
  // 3. Discover opportunities
  // -----------------------------------------

  const discoveryResult =
    discoverOpportunities(discoveryContext);


  const opportunities =
    Array.isArray(discoveryResult?.opportunities)
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Score and rank opportunities
  // -----------------------------------------

  const rankedOpportunities =
    rankOpportunities(
      opportunities,
      {
        user,
        ...discoveryContext
      }
    );


  // -----------------------------------------
  // 5. Return structured result
  // -----------------------------------------

  return {

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context: {
      user,
      ...discoveryContext
    },

    discovery: {
      success:
        discoveryResult?.success ?? false,

      count:
        opportunities.length
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
