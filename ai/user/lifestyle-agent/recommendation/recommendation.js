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
 * Recommendation Decision
 *    ↓
 * Lifestyle Response
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
  applyRecommendationDecision,
  buildDecisionSummary
} = require("../recommendation/recommendation");

const {
  buildLifestyleResponse
} = require("../recommendation/lifestyle-response-builder");


async function generateLifestyleRecommendations(input = {}) {

  const {
    user = {},
    context = {}
  } = input;


  // =========================================
  // 1. NORMALIZE LOCATION
  // =========================================

  const location =
    getLocationContext(
      context.location || {}
    );


  // =========================================
  // 2. BUILD AGENT CONTEXT
  // =========================================

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


  // =========================================
  // 3. DISCOVER OPPORTUNITIES
  // =========================================

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


  // =========================================
  // 4. REASON ABOUT OPPORTUNITIES
  // =========================================

  const reasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // =========================================
  // 5. ATTACH REASONING SIGNALS
  // =========================================

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


  // =========================================
  // 6. CALCULATE OPPORTUNITY SCORE
  // =========================================

  const scoredOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // =========================================
  // 7. APPLY PRACTICAL UTILITY SCORING
  // =========================================

  const utilityRankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      agentContext
    );


  // =========================================
  // 8. APPLY RECOMMENDATION DECISION
  // =========================================

  const decidedRecommendations =
    applyRecommendationDecision(
      utilityRankedOpportunities
    );


  // =========================================
  // 9. BUILD DECISION SUMMARY
  // =========================================

  const decisionSummary =
    buildDecisionSummary(
      decidedRecommendations
    );


  // =========================================
  // 10. BUILD USER-FACING RESPONSE
  // =========================================

  const lifestyleResponse =
    buildLifestyleResponse(
      decidedRecommendations,
      agentContext
    );


  // =========================================
  // 11. RETURN COMPLETE AGENT RESULT
  // =========================================

  return {

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context:
      agentContext,


    // -----------------------------------------
    // Discovery
    // -----------------------------------------

    discovery: {

      success:
        discoveryResult?.success ?? false,

      count:
        opportunities.length

    },


    // -----------------------------------------
    // Reasoning
    // -----------------------------------------

    reasoning: {

      enabled:
        true,

      count:
        reasoningResult.length

    },


    // -----------------------------------------
    // Ranking
    // -----------------------------------------

    ranking: {

      count:
        utilityRankedOpportunities.length

    },


    // -----------------------------------------
    // Recommendation Decision
    // -----------------------------------------

    decision: {

      enabled:
        true,

      count:
        decidedRecommendations.length,

      primary:
        decidedRecommendations[0]?.id || null,

      summary:
        decisionSummary

    },


    // -----------------------------------------
    // Machine-readable recommendations
    // -----------------------------------------

    recommendations:
      decidedRecommendations,


    // -----------------------------------------
    // User-facing response
    // -----------------------------------------

    response:
      lifestyleResponse,


    // -----------------------------------------
    // Timestamp
    // -----------------------------------------

    timestamp:
      new Date().toISOString()

  };

}


module.exports = {
  generateLifestyleRecommendations
};
