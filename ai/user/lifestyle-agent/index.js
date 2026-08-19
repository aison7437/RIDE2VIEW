/**
 * RIDE2VIEW Lifestyle Agent
 *
 * Main execution pipeline:
 *
 * User Request
 *      ↓
 * Intent Parser
 *      ↓
 * Intent Normalizer
 *      ↓
 * Location Context
 *      ↓
 * Opportunity Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Opportunity Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendations
 */

const { parseIntent } = require("./intent/intent-parser");
const { normalizeIntent } = require("./intent/intent-normalizer");

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");

async function runLifestyleAgent(request = {}) {
  try {
    const message =
      typeof request === "string"
        ? request
        : request.message || "";

    /*
     * STEP 1 — Parse user intent
     */
    const rawIntent = parseIntent(message);

    /*
     * STEP 2 — Normalize intent
     */
    const intent = normalizeIntent(rawIntent);

    /*
     * STEP 3 — Build enriched request
     *
     * This is what the downstream workflow receives.
     */
    const enrichedRequest = {
      ...request,

      message,

      intent,

      /*
       * Compatibility fields for existing workflows.
       */
      userGoal: intent.wantsProperty
        ? "property"
        : intent.wantsMobility
          ? "mobility"
          : intent.wantsFood
            ? "food"
            : intent.wantsShopping
              ? "shopping"
              : "general",

      segment: intent.segment,

      preferences: [
        ...(
          intent.wantsProperty
            ? ["property"]
            : []
        ),

        ...(
          intent.wantsMobility
            ? ["mobility"]
            : []
        ),

        ...(
          intent.wantsStudent
            ? ["student"]
            : []
        ),

        ...(
          intent.wantsWomenOnly
            ? ["women-only"]
            : []
        ),

        ...(
          intent.wantsVIP
            ? ["vip"]
            : []
        ),

        ...(
          intent.wantsPremium
            ? ["premium"]
            : []
        )
      ]
    };

    /*
     * STEP 4 — Run existing recommendation pipeline
     */
    const result = await generateLifestyleRecommendations(
      enrichedRequest
    );

    /*
     * STEP 5 — Return agent result
     */
    return {
      ...result,

      intent,

      agent: "ride2view-lifestyle-agent",

      success: result?.success !== false
    };

  } catch (error) {
    console.error(
      "[Lifestyle Agent] Error:",
      error
    );

    return {
      agent: "ride2view-lifestyle-agent",

      success: false,

      error: error.message,

      intent: null,

      recommendations: [],

      alternatives: []
    };
  }
}


/*
 * Export the primary agent function.
 */
module.exports = {
  runLifestyleAgent,

  /*
   * Compatibility aliases.
   */
  generateLifestyleRecommendations: runLifestyleAgent,
  generateRecommendations: runLifestyleAgent
};


/*
 * Optional CLI test.
 *
 * Allows:
 *
 * node index.js
 */
if (require.main === module) {
  runLifestyleAgent({
    message:
      "Find me a suitable property in Nairobi and women-only transport."
  })
    .then(result => {
      console.log(
        JSON.stringify(result, null, 2)
      );
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
        }
