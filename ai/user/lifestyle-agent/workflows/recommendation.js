/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Purpose:
 * Take reasoned opportunities, apply utility scoring,
 * rank them, and return structured recommendations.
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Utility Scoring
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
 */


/**
 * Utility scoring model.
 *
 * IMPORTANT:
 * This file must exist at:
 *
 * ai/user/lifestyle-agent/models/utility-scoring.js
 */
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
 * Apply utility scoring to opportunities.
 *
 * Each opportunity receives:
 *
 * - utilityScore
 * - utilityLevel
 * - utilityFactors
 * - utilityExplanation
 */
function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalizedOpportunities =
    normalizeArray(opportunities);


  return normalizedOpportunities.map(
    (opportunity) =>
      evaluateUtility(
        opportunity,
        context
      )
  );
}


/**
 * Rank recommendations by utility.
 *
 * Utility score is the primary ranking signal.
 *
 * Existing opportunity score is used
 * as the secondary ranking signal.
 *
 * Opportunity ID is used as the final
 * deterministic tie-breaker.
 */
function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalizedOpportunities =
    normalizeArray(opportunities);


  return rankByUtility(
    normalizedOpportunities,
    context
  );
}


/**
 * Generate final lifestyle recommendations.
 *
 * This is the main function consumed by
 * the Lifestyle Agent.
 */
async function generateRecommendations(
  opportunities = [],
  context = {}
) {

  const normalizedOpportunities =
    normalizeArray(opportunities);


  /*
   * ==========================================
   * STEP 1
   * UTILITY SCORING
   * ==========================================
   */

  const scoredOpportunities =
    scoreRecommendations(
      normalizedOpportunities,
      context
    );


  /*
   * ==========================================
   * STEP 2
   * RANKING
   * ==========================================
   */

  const rankedOpportunities =
    rankRecommendations(
      scoredOpportunities,
      context
    );


  /*
   * ==========================================
   * STEP 3
   * ATTACH RANK INFORMATION
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
   * STEP 4
   * DETERMINE PRIMARY RECOMMENDATION
   * ==========================================
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * ==========================================
   * STEP 5
   * RETURN RESULT
   * ==========================================
   */

  return {

    success:
      true,

    count:
      recommendations.length,

    primary:
      primary,

    recommendations:
      recommendations

  };

}


/**
 * Synchronous version.
 *
 * Useful for tests and internal workflows
 * that do not need Promise handling.
 */
function buildRecommendations(
  opportunities = [],
  context = {}
) {

  const normalizedOpportunities =
    normalizeArray(opportunities);


  const scoredOpportunities =
    scoreRecommendations(
      normalizedOpportunities,
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
 * Export workflow functions.
 */
module.exports = {

  generateRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
