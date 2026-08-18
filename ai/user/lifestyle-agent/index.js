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
 * Utility Scoring
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

    },

    request

  };


  /*
   * ==========================================
   * EXECUTE RECOMMENDATION WORKFLOW
   * ==========================================
   */

  const result =
    await generateLifestyleRecommendations(
      workflowInput
    );


  /*
   * ==========================================
   * NORMALIZE WORKFLOW RESULT
   * ==========================================
   *
   * Preserve discovery, reasoning and ranking
   * so the test harness and downstream agents
   * can inspect the complete pipeline.
   */

  const discovery =
    result?.discovery || {
      success: false,
      count: 0
    };


  const reasoning =
    result?.reasoning || {
      enabled: false,
      count: 0
    };


  const ranking =
    result?.ranking || {
      count:
        Array.isArray(
          result?.recommendations
        )
          ? result.recommendations.length
          : 0
    };


  /*
   * ==========================================
   * RETURN COMPLETE AGENT RESULT
   * ==========================================
   */

  return {

    agent:
      "ride2view-lifestyle-agent",

    request,

    success:
      result?.success === true,

    context: {

      ...context,

      request

    },

    discovery,

    reasoning,

    ranking,

    count:
      result?.count ??
      (
        Array.isArray(
          result?.recommendations
        )
          ? result.recommendations.length
          : 0
      ),

    primary:
      result?.primary || null,

    alternatives:
      Array.isArray(
        result?.alternatives
      )
        ? result.alternatives
        : [],

    recommendations:
      Array.isArray(
        result?.recommendations
      )
        ? result.recommendations
        : [],

    nextAction:
      result?.nextAction || {
        action: "none",
        label: "No recommendation available"
      },

    summary:
      result?.summary || {
        total: 0,
        strongMatches: 0,
        excellentUtility: 0,
        highUtility: 0,
        moderateUtility: 0,
        alternatives: 0
      },

    timestamp:
      new Date().toISOString()

  };

}


/**
 * Export Lifestyle Agent.
 */
module.exports = {
  runLifestyleAgent
};
