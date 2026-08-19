/**
 * RIDE2VIEW Lifestyle Agent
 *
 * Main execution pipeline:
 *
 * User Request
 *      ↓
 * Message Extraction
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
 * Scoring
 *      ↓
 * Ranking
 *      ↓
 * Recommendations
 */

const { parseIntent } =
  require("./intent/intent-parser");

const { normalizeIntent } =
  require("./intent/intent-normalizer");

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");


/*
 * ============================================================
 * MESSAGE EXTRACTION
 * ============================================================
 *
 * Supports:
 *
 * runLifestyleAgent("find me...")
 *
 * runLifestyleAgent({
 *   message: "find me..."
 * })
 *
 * runLifestyleAgent({
 *   request: {
 *     message: "find me..."
 *   }
 * })
 *
 * runLifestyleAgent({
 *   userRequest: "find me..."
 * })
 */

function extractMessage(request = {}) {

  if (typeof request === "string") {
    return request.trim();
  }


  if (!request || typeof request !== "object") {
    return "";
  }


  const candidates = [

    request.message,

    request.userMessage,

    request.userRequest,

    request.query,

    request.text,

    request.prompt,

    request.request?.message,

    request.request?.userMessage,

    request.request?.userRequest,

    request.request?.query,

    request.request?.text,

    request.input,

    request.input?.message,

    request.input?.text
  ];


  for (const candidate of candidates) {

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }


  return "";
}


/*
 * ============================================================
 * MAIN AGENT
 * ============================================================
 */

async function runLifestyleAgent(request = {}) {

  try {

    /*
     * --------------------------------------------------------
     * STEP 1 — Extract actual user message
     * --------------------------------------------------------
     */

    const message =
      extractMessage(request);


    console.log(
      "[Lifestyle Agent] Message:",
      message
    );


    /*
     * --------------------------------------------------------
     * STEP 2 — Parse intent
     * --------------------------------------------------------
     */

    const rawIntent =
      parseIntent(message);


    console.log(
      "[Lifestyle Agent] Raw Intent:",
      JSON.stringify(
        rawIntent,
        null,
        2
      )
    );


    /*
     * --------------------------------------------------------
     * STEP 3 — Normalize intent
     * --------------------------------------------------------
     */

    const intent =
      normalizeIntent(rawIntent);


    console.log(
      "[Lifestyle Agent] Normalized Intent:",
      JSON.stringify(
        intent,
        null,
        2
      )
    );


    /*
     * --------------------------------------------------------
     * STEP 4 — Determine primary user goal
     * --------------------------------------------------------
     */

    let userGoal = "general";


    if (intent.wantsProperty) {

      userGoal = "property";

    } else if (intent.wantsMobility) {

      userGoal = "mobility";

    } else if (intent.wantsFood) {

      userGoal = "food";

    } else if (intent.wantsShopping) {

      userGoal = "shopping";
    }


    /*
     * --------------------------------------------------------
     * STEP 5 — Build preferences
     * --------------------------------------------------------
     */

    const preferences = [];


    if (intent.wantsProperty) {
      preferences.push("property");
    }


    if (intent.wantsMobility) {
      preferences.push("mobility");
    }


    if (intent.wantsStudent) {
      preferences.push("student");
    }


    if (intent.wantsWomenOnly) {
      preferences.push("women-only");
    }


    if (intent.wantsVIP) {
      preferences.push("vip");
    }


    if (intent.wantsPremium) {
      preferences.push("premium");
    }


    if (intent.wantsAffordable) {
      preferences.push("affordable");
    }


    if (intent.wantsBudgetOptimization) {
      preferences.push("budget-optimization");
    }


    /*
     * --------------------------------------------------------
     * STEP 6 — Build enriched request
     * --------------------------------------------------------
     */

    const originalRequest =
      typeof request === "object" &&
      request !== null
        ? request
        : {};


    const enrichedRequest = {

      ...originalRequest,

      message,

      intent,

      userGoal,

      segment:
        intent.segment,

      segments:
        intent.segments,

      preferences,

      budget:
        intent.budget,

      bedrooms:
        intent.bedrooms,

      location:
        intent.location,

      /*
       * Explicit service flags.
       */
      wantsProperty:
        intent.wantsProperty,

      wantsMobility:
        intent.wantsMobility,

      wantsFood:
        intent.wantsFood,

      wantsShopping:
        intent.wantsShopping,

      /*
       * Explicit segment flags.
       */
      wantsStudent:
        intent.wantsStudent,

      wantsWomenOnly:
        intent.wantsWomenOnly,

      wantsVIP:
        intent.wantsVIP,

      wantsPremium:
        intent.wantsPremium,

      wantsAffordable:
        intent.wantsAffordable,

      wantsBudgetOptimization:
        intent.wantsBudgetOptimization
    };


    console.log(
      "[Lifestyle Agent] Enriched Request:",
      JSON.stringify(
        enrichedRequest,
        null,
        2
      )
    );


    /*
     * --------------------------------------------------------
     * STEP 7 — Run recommendation workflow
     * --------------------------------------------------------
     */

    const result =
      await generateLifestyleRecommendations(
        enrichedRequest
      );


    /*
     * --------------------------------------------------------
     * STEP 8 — Return final agent result
     * --------------------------------------------------------
     */

    return {

      ...result,

      agent:
        "ride2view-lifestyle-agent",

      success:
        result?.success !== false,

      intent,

      request: {
        message,
        userGoal,
        segment:
          intent.segment,
        segments:
          intent.segments,
        budget:
          intent.budget,
        bedrooms:
          intent.bedrooms,
        location:
          intent.location
      }
    };


  } catch (error) {

    console.error(
      "[Lifestyle Agent] Error:",
      error
    );


    return {

      agent:
        "ride2view-lifestyle-agent",

      success: false,

      error:
        error.message,

      intent: null,

      recommendations: [],

      alternatives: []
    };
  }
}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {

  runLifestyleAgent,

  /*
   * Backwards compatibility.
   */
  generateLifestyleRecommendations:
    runLifestyleAgent,

  generateRecommendations:
    runLifestyleAgent
};


/*
 * ============================================================
 * DIRECT CLI TEST
 * ============================================================
 *
 * Run:
 *
 * node index.js
 */

if (
  require.main === module
) {

  runLifestyleAgent({

    message:
      "Find me a property in Nairobi and women-only transport."
  })

    .then(result => {

      console.log(
        "\n===== FINAL RESULT =====\n"
      );

      console.log(
        JSON.stringify(
          result,
          null,
          2
        )
      );

    })

    .catch(error => {

      console.error(error);

      process.exit(1);
    });
    }
