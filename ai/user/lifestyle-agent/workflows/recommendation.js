/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Purpose:
 * Converts ranked lifestyle opportunities into
 * a structured, user-facing recommendation.
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Opportunity Scoring
 *    ↓
 * Utility Scoring
 *    ↓
 * Ranking
 *    ↓
 * Decision
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


async function generateLifestyleRecommendations(input = {}) {

  const {
    user = {},
    context = {}
  } = input;


  // ==========================================
  // 1. NORMALIZE LOCATION
  // ==========================================

  const location =
    getLocationContext(
      context.location || {}
    );


  // ==========================================
  // 2. BUILD AGENT CONTEXT
  // ==========================================

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


  // ==========================================
  // 3. DISCOVER OPPORTUNITIES
  // ==========================================

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


  // ==========================================
  // 4. REASON ABOUT OPPORTUNITIES
  // ==========================================

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // ==========================================
  // 5. ATTACH REASONING SIGNALS
  // ==========================================

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


  // ==========================================
  // 6. OPPORTUNITY SCORING
  // ==========================================

  const scoredOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // ==========================================
  // 7. UTILITY SCORING
  // ==========================================

  const utilityRankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      agentContext
    );


  // ==========================================
  // 8. BUILD USER-FACING RESPONSE
  // ==========================================

  const lifestyleResponse =
    buildLifestyleResponse(
      utilityRankedOpportunities,
      agentContext
    );


  // ==========================================
  // 9. RETURN COMPLETE AGENT RESULT
  // ==========================================

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

    decision: {

      enabled:
        true,

      count:
        utilityRankedOpportunities.length,

      primary:
        utilityRankedOpportunities.find(
          item =>
            item.primary === true
        )?.id || null

    },

    recommendations:
      utilityRankedOpportunities,

    response:
      lifestyleResponse,

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


  // ==========================================
  // 3. DISCOVER OPPORTUNITIES
  // ==========================================

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


  // ==========================================
  // 4. REASON ABOUT OPPORTUNITIES
  // ==========================================

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // ==========================================
  // 5. ATTACH REASONING SIGNALS
  // ==========================================

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


  // ==========================================
  // 6. OPPORTUNITY SCORING
  // ==========================================

  const scoredOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // ==========================================
  // 7. UTILITY SCORING
  // ==========================================

  const utilityRankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      agentContext
    );


  // ==========================================
  // 8. BUILD USER-FACING RESPONSE
  // ==========================================

  const lifestyleResponse =
    buildLifestyleResponse(
      utilityRankedOpportunities,
      agentContext
    );


  // ==========================================
  // 9. RETURN COMPLETE AGENT RESULT
  // ==========================================

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

    decision: {

      enabled:
        true,

      count:
        utilityRankedOpportunities.length,

      primary:
        utilityRankedOpportunities.find(
          item =>
            item.primary === true
        )?.id || null

    },

    recommendations:
      utilityRankedOpportunities,

    response:
      lifestyleResponse,

    timestamp:
      new Date().toISOString()

  };

}


module.exports = {
  generateLifestyleRecommendations
};
