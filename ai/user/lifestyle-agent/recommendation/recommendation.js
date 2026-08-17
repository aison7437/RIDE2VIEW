/**
 * Ride2View Lifestyle Agent
 * Lifestyle Recommendation Workflow
 *
 * Pipeline:
 *
 * Location
 *    ↓
 * Opportunity Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Opportunity Scoring
 *    ↓
 * Utility Scoring
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
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
  rankByUtility
} = require("../models/utility-scoring");


async function generateLifestyleRecommendations(input = {}) {

  const {
    user = {},
    context = {}
  } = input;


  // 1. Normalize location

  const location =
    getLocationContext(
      context.location || {}
    );


  // 2. Build agent context

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


  // 3. Discover opportunities

  const discoveryResult =
    discoverOpportunities(
      agentContext
    );

  const opportunities =
    Array.isArray(
      discoveryResult?.opportunities
    )
      ? discoveryResult.opportunities
      : [];


  // 4. Reason about opportunities

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // 5. Attach reasoning signals

  const reasonedOpportunities =
    opportunities.map(
      (opportunity) => {

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

      }
    );


  // 6. Calculate opportunity score

  const scoredOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // 7. Apply practical utility scoring

  const utilityRankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      agentContext
    );


  // 8. Return result

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

      enabled:
        true,

      count:
        reasoningResult.length

    },

    ranking: {

      count:
        utilityRankedOpportunities.length

    },

    recommendations:
      utilityRankedOpportunities,

    timestamp:
      new Date().toISOString()

  };

}


module.exports = {
  generateLifestyleRecommendations
};
