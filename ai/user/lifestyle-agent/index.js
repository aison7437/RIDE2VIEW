/**
 * Ride2View Lifestyle Agent
 *
 * Main execution entry point.
 *
 * Pipeline:
 * User Request
 *      ↓
 * Context
 *      ↓
 * Opportunity Discovery
 *      ↓
 * Opportunity Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendation
 */

const {
  discoverOpportunities
} = require("./tools/opportunity-discovery");

const {
  rankOpportunities
} = require("./models/opportunity-scoring");


/**
 * Run the Lifestyle Agent.
 *
 * @param {Object} request - User request
 * @param {Object} context - User/context information
 * @returns {Object} Ranked opportunities
 */
async function runLifestyleAgent(request = {}, context = {}) {

  // 1. Discover available opportunities
  const opportunities = await discoverOpportunities(
    request,
    context
  );

  // 2. Score and rank opportunities
  const rankedOpportunities = rankOpportunities(
    opportunities,
    context
  );

  // 3. Return structured result
  return {
    agent: "ride2view-lifestyle-agent",
    request,
    recommendations: rankedOpportunities,
    timestamp: new Date().toISOString()
  };
}


module.exports = {
  runLifestyleAgent
};
