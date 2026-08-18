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
 * Scoring
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
   * EXECUTE WORKFLOW
   * ==========================================
   */

  const result =
    await generateLifestyleRecommendations(
      workflowInput
    );


  /*
   * ==========================================
   * RETURN WORKFLOW RESULT
   *
   * Do NOT replace missing values with fake
   * empty objects. Preserve the real result.
   * ==========================================
   */

  return {

    agent:
      "ride2view-lifestyle-agent",

    request,

    ...result

  };

}


module.exports = {
  runLifestyleAgent
};
