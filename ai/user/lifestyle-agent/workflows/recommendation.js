/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * User Context
 *      ↓
 * Location Context
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
  evaluateUtility,
  rankByUtility
} = require("../models/utility-scoring");


/**
 * Safely normalize an array.
 */
function normalizeArray(value) {

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}


/**
 * Generate Lifestyle Agent recommendations.
 *
 * This is the main workflow used by index.js.
 */
async function generateLifestyleRecommendations(
  input = {}
) {

  /*
   * ==========================================
   * STEP 1
   * READ INPUT
   * ==========================================
   */

  const user =
    input.user || {};

  const incomingContext =
    input.context || {};


  /*
   * ==========================================
   * STEP 2
   * NORMALIZE LOCATION
   * ==========================================
   */

  const location =
    getLocationContext(
      incomingContext.location || {}
    );


  /*
   * ==========================================
   * STEP 3
   * BUILD AGENT CONTEXT
   * ==========================================
   */

  const agentContext = {

    user,

    userGoal:
      incomingContext.userGoal || null,

    goal:
      incomingContext.userGoal || null,

    location,

    budget:
      incomingContext.budget ?? null,

    availableTime:
      incomingContext.availableTime ?? null,

    currentActivity:
      incomingContext.currentActivity || null,

    destination:
      incomingContext.destination || null

  };


  /*
   * ==========================================
   * STEP 4
   * DISCOVER OPPORTUNITIES
   * ==========================================
   */

  const discoveryResult =
    discoverOpportunities(
      agentContext
    );


  const opportunities =
    normalizeArray(
      discoveryResult?.opportunities
    );


  /*
   * ==========================================
   * STEP 5
   * REASON ABOUT OPPORTUNITIES
   * ==========================================
   */

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  const reasoning =
    normalizeArray(
      reasoningResult
    );


  /*
   * ==========================================
   * STEP 6
   * ATTACH REASONING SIGNALS
   * ==========================================
   */

  const reasonedOpportunities =
    opportunities.map(
      (opportunity) => {

        const reasoningItem =
          reasoning.find(
            (item) =>
              item.opportunity === opportunity
              ||
              item.opportunity?.id === opportunity.id
              ||
              item.id === opportunity.id
          );


        return {

          ...opportunity,

          reasoningScore:
            reasoningItem?.reasoningScore ?? 0,

          reasoningFactors:
            reasoningItem?.factors || []

        };

      }
    );


  /*
   * ==========================================
   * STEP 7
   * UTILITY SCORING
   * ==========================================
   */

  const scoredOpportunities =
    reasonedOpportunities.map(
      (opportunity) =>
        evaluateUtility(
          opportunity,
          agentContext
        )
    );


  /*
   * ==========================================
   * STEP 8
   * RANK BY UTILITY
   * ==========================================
   */

  const rankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      agentContext
    );


  /*
   * ==========================================
   * STEP 9
   * ATTACH RANK
   * ==========================================
   */

  const recommendations =
    rankedOpportunities.map(
      (opportunity, index) => {

        return {

          ...opportunity,

          rank:
            index + 1

        };

      }
    );


  /*
   * ==========================================
   * STEP 10
   * PRIMARY RECOMMENDATION
   * ==========================================
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * ==========================================
   * STEP 11
   * RETURN COMPLETE RESULT
   * ==========================================
   */

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
        reasoning.length > 0,

      count:
        reasoning.length

    },

    ranking: {

      count:
        recommendations.length

    },

    count:
      recommendations.length,

    primary,

    recommendations,

    timestamp:
      new Date().toISOString()

  };

}


/**
 * Score opportunities using utility scoring.
 */
function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  return normalizeArray(
    opportunities
  ).map(
    (opportunity) =>
      evaluateUtility(
        opportunity,
        context
      )
  );

}


/**
 * Rank opportunities by utility.
 */
function rankRecommendations(
  opportunities = [],
  context = {}
) {

  return rankByUtility(
    normalizeArray(
      opportunities
    ),
    context
  );

}


/**
 * Alternative synchronous helper.
 */
function buildRecommendations(
  opportunities = [],
  context = {}
) {

  const scoredOpportunities =
    scoreRecommendations(
      opportunities,
      context
    );


  const rankedOpportunities =
    rankRecommendations(
      scoredOpportunities,
      context
    );


  return rankedOpportunities.map(
    (opportunity, index) => {

      return {

        ...opportunity,

        rank:
          index + 1

      };

    }
  );

}


/**
 * Export functions.
 */
module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
