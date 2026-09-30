/**
 * Ride2View Lifestyle Agent
 *
 * Main Agent Entry Point
 *
 * Pipeline:
 *
 * User Request
 *      ↓
 * Lifestyle Agent
 *      ↓
 * Recommendation Workflow
 *      ↓
 * Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendations
 */

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");
const lifestyleIntelligenceV2 = require("./core/lifestyle-intelligence-v2");


/* =========================================================
   RUN LIFESTYLE AGENT
   ========================================================= */

async function runLifestyleAgent(input = {}, context = {}) {

  return generateLifestyleRecommendations(
    { ...context, ...input }
  );

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  runLifestyleAgent,

  generateLifestyleRecommendations,
  execute: lifestyleIntelligenceV2.execute,
  healthCheck: lifestyleIntelligenceV2.healthCheck

};
