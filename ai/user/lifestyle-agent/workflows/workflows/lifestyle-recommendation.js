/**
 * Ride2View Lifestyle Agent
 * Lifestyle Recommendation Workflow
 *
 * Purpose:
 * Orchestrates location context, opportunity discovery,
 * and opportunity scoring into a ranked recommendation.
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


async function generateLifestyleRecommendations(input = {}) {
  const {
    user = {},
    context = {}
  } = input;

  // 1. Build normalized location context
  const location = getLocationContext(
    context.location || {}
  );

  // 2. Build the context used by opportunity discovery
  const discoveryContext = {
    userGoal: context.userGoal || null,
    location,
    budget: context.budget || null,
    availableTime: context.availableTime || null
  };

  // 3. Discover possible opportunities
  const discoveryResult =
    discoverOpportunities(discoveryContext);

  const opportunities =
    Array.isArray(discoveryResult?.opportunities)
      ? discoveryResult.opportunities
      : [];

  // 4. Score and rank opportunities
  const rankedOpportunities =
    rankOpportunities(
      opportunities,
      {
        user,
        ...discoveryContext
      }
    );

  // 5. Return structured recommendation result
  return {
    success: true,

    agent: "ride2view-lifestyle-agent",

    context: {
      user,
      ...discoveryContext
    },

    discovery: {
      success: discoveryResult?.success ?? true,
      count: opportunities.length
    },

    recommendations: rankedOpportunities,

    timestamp: new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};
