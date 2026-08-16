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
 * Opportunity Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendation Formatter
 *      ↓
 * Structured Recommendation
 */

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");


/**
 * Run the Ride2View Lifestyle Agent.
 *
 * @param {Object} request - User request
 * @param {Object} context - User/context information
 * @returns {Object} Structured lifestyle recommendations
 */
async function runLifestyleAgent(
  request = {},
  context = {}
) {

  // Combine request and contextual information
  // into the workflow input.
  const workflowInput = {
    user: context.user || {},
    context: {
      ...context,
      request
    }
  };

  // Execute the recommendation workflow.
  const result =
    await generateLifestyleRecommendations(
      workflowInput
    );

  return {
    agent: "ride2view-lifestyle-agent",
    request,
    ...result
  };
}


module.exports = {
  runLifestyleAgent
};
