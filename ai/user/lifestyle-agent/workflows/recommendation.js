/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
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
 * Score opportunities using the utility model.
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
 * Rank opportunities by utility.
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
 * Generate Lifestyle Agent recommendations.
 *
 * IMPORTANT:
 * This exact function name is required by index.js:
 *
 * generateLifestyleRecommendations
 */
async function generateLifestyleRecommendations(
  input = {}
) {

  const {
    opportunities = [],
    context = {}
  } = input;


  /*
   * ==========================================
   * STEP 1
   * NORMALIZE OPPORTUNITIES
   * ==========================================
   */

  const normalizedOpportunities =
    normalizeArray(
      opportunities
    );


  /*
   * ==========================================
   * STEP 2
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
   * STEP 3
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
   * STEP 4
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
   * STEP 5
   * PRIMARY RECOMMENDATION
   * ==========================================
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * ==========================================
   * STEP 6
   * RETURN RESULT
   * ==========================================
   */

  return {

    success: true,

    count:
      recommendations.length,

    primary,

    recommendations

  };

}


/**
 * Alternative synchronous helper.
 */
function buildRecommendations(
  opportunities = [],
  context = {}
) {

  const normalizedOpportunities =
    normalizeArray(
      opportunities
    );


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
 * Export functions.
 */
module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
