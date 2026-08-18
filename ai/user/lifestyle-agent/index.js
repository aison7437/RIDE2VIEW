/**
 * Ride2View Lifestyle Agent
 *
 * Main execution entry point.
 *
 * Pipeline:
 *
 * User Request
 *      ↓
 * Recommendation Workflow
 *      ↓
 * Location Context
 *      ↓
 * Opportunity Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Utility / Opportunity Scoring
 *      ↓
 * Ranking
 *      ↓
 * Structured Recommendation
 */

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");


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

  const workflowInput = {

    user:
      context.user || {},

    context: {

      ...context,

      request

    }

  };


  const result =
    await generateLifestyleRecommendations(
      workflowInput
    );


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


module.exports = {
  runLifestyleAgent
};
