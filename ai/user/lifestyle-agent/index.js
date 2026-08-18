/**
 * Ride2View Lifestyle Agent
 *
 * Main execution entry point.
 *
 * Pipeline:
 *
 * User Request
 *      ↓
 * Lifestyle Recommendation Workflow
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
 * Recommendation
 *      ↓
 * Structured Recommendation
 */

const {
  generateLifestyleRecommendations
} = require("./workflows/lifestyle-recommendation");


/**
 * Run the Ride2View Lifestyle Agent.
 *
 * @param {Object} request
 * @param {Object} context
 * @returns {Object}
 */
async function runLifestyleAgent(
  request = {},
  context = {}
) {

  /*
   * ==========================================
   * BUILD WORKFLOW INPUT
   * ==========================================
   */

  const workflowInput = {

    user:
      context.user || {},

    context: {

      ...context,

      request

    }

  };


  /*
   * ==========================================
   * EXECUTE LIFESTYLE WORKFLOW
   * ==========================================
   */

  const result =
    await generateLifestyleRecommendations(
      workflowInput
    );


  /*
   * ==========================================
   * RETURN STRUCTURED AGENT RESULT
   * ==========================================
   */

  return {

    agent:
      "ride2view-lifestyle-agent",

    request,

    success:
      result?.success === true,

    context:
      result?.context || {},

    discovery:
      result?.discovery || {
        success: false,
        count: 0
      },

    reasoning:
      result?.reasoning || {
        enabled: false,
        count: 0
      },

    ranking:
      result?.ranking || {
        count: 0
      },

    recommendations:
      Array.isArray(
        result?.recommendations
      )
        ? result.recommendations
        : [],

    timestamp:
      result?.timestamp ||
      new Date().toISOString()

  };

}


/*
 * ==========================================
 * EXPORT
 * ==========================================
 */

module.exports = {

  runLifestyleAgent

};
