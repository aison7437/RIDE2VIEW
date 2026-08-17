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
 * Response Builder
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

const {
  buildLifestyleResponse
} = require("../recommendation/recommendation-formatter");


async function generateLifestyleRecommendations(
  input = {}
) {

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
      context.userGoal ||
      context.goal ||
      null,

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


  const safeReasoning =
    Array.isArray(reasoningResult)
      ? reasoningResult
      : [];


  // 5. Attach reasoning signals

  const reasonedOpportunities =
    opportunities.map(
      opportunity => {

        const reasoning =
          safeReasoning.find(
            item =>
              item.opportunity ===
              opportunity
          );


        return {

          ...opportunity,

          reasoningScore:
            reasoning?.reasoningScore ??
            0,

          reasoningFactors:
            reasoning?.factors ??
            []

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


  // 8. Build user-facing response

  const lifestyleResponse =
    buildLifestyleResponse(
      utilityRankedOpportunities,
      agentContext
    );


  // 9. Return complete agent result

  return {

    ...lifestyleResponse,

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context:
      agentContext,

    discovery: {

      success:
        discoveryResult?.success ??
        false,

      count:
        opportunities.length

    },

    reasoning: {

      enabled:
        true,

      count:
        safeReasoning.length

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
