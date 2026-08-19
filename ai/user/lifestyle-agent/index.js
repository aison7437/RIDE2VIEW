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


/* =========================================================
   RUN LIFESTYLE AGENT
   ========================================================= */

async function runLifestyleAgent(input = {}) {

  return generateLifestyleRecommendations(
    input
  );

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  runLifestyleAgent,

  generateLifestyleRecommendations

};
