/**
 * RIDE2VIEW Lifestyle Agent
 *
 * MAIN PIPELINE
 *
 * User Request
 *      ↓
 * Intent Parser
 *      ↓
 * Intent Normalizer
 *      ↓
 * Enriched Request
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
 * Recommendation Formatter
 *      ↓
 * Final Response
 */

const { parseIntent } = require("./intent/intent-parser");
const { normalizeIntent } = require("./intent/intent-normalizer");

const {
  generateLifestyleRecommendations
} = require("./workflows/recommendation");


/**
 * Run the RIDE2VIEW Lifestyle Agent.
 *
 * @param {Object|string} request
 * @returns {Promise<Object>}
 */
async function runLifestyleAgent(request = {}) {

  try {

    /*
     * ---------------------------------------------------------
     * STEP 1 — Extract user message
     * ---------------------------------------------------------
     */

    const message =
      typeof request === "string"
        ? request
        : request?.message || "";


    if (!message.trim()) {

      return {
        agent: "ride2view-lifestyle-agent",
        success: false,
        error: "No user message was provided.",
        intent: null,
        recommendations: [],
        alternatives: []
      };

    }


    /*
     * ---------------------------------------------------------
     * STEP 2 — Parse raw intent
     * ---------------------------------------------------------
     */

    const rawIntent = parseIntent(message);


    /*
     * ---------------------------------------------------------
     * STEP 3 — Normalize intent
     * ---------------------------------------------------------
     */

    const intent = normalizeIntent(rawIntent);


    /*
     * ---------------------------------------------------------
     * STEP 4 — Build compatibility fields
     * ---------------------------------------------------------
     *
     * Older parts of the Lifestyle Agent may still expect
     * fields such as userGoal and preferences.
     *
     * We therefore keep the normalized intent as the source
     * of truth while maintaining backward compatibility.
     */

    const preferences = [];


    if (intent.wantsProperty) {
      preferences.push("property");
    }

    if (intent.wantsMobility) {
      preferences.push("mobility");
    }

    if (intent.wantsFood) {
      preferences.push("food");
    }

    if (intent.wantsShopping) {
      preferences.push("shopping");
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


    /*
     * ---------------------------------------------------------
     * STEP 5 — Determine primary user goal
     * ---------------------------------------------------------
     */

    let userGoal = "general";


    if (intent.wantsProperty) {
      userGoal = "property";
    }

    else if (intent.wantsMobility) {
      userGoal = "mobility";
    }

    else if (intent.wantsFood) {
      userGoal = "food";
    }

    else if (intent.wantsShopping) {
      userGoal = "shopping";
    }


    /*
     * ---------------------------------------------------------
     * STEP 6 — Create enriched request
     * ---------------------------------------------------------
     */

    const enrichedRequest = {

      ...(
        typeof request === "object"
          ? request
          : {}
      ),

      message,

      intent,

      userGoal,

      segment:
        intent.segment || "general",

      preferences,

      /*
       * Explicit segment flags.
       *
       * These make downstream agents easier to develop.
       */

      segments: {

        general:
          intent.segment === "general",

        womenOnly:
          Boolean(intent.wantsWomenOnly),

        student:
          Boolean(intent.wantsStudent),

        vip:
          Boolean(intent.wantsVIP),

        premium:
          Boolean(intent.wantsPremium)

      }

    };


    /*
     * ---------------------------------------------------------
     * STEP 7 — Execute recommendation workflow
     * ---------------------------------------------------------
     */

    const result =
      await generateLifestyleRecommendations(
        enrichedRequest
      );


    /*
     * ---------------------------------------------------------
     * STEP 8 — Return unified agent response
     * ---------------------------------------------------------
     */

    return {

      ...result,

      agent:
        "ride2view-lifestyle-agent",

      success:
        result?.success !== false,

      intent,

      userGoal,

      segment:
        intent.segment || "general",

      preferences

    };

  }


  catch (error) {

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
 * -------------------------------------------------------------
 * EXPORTS
 * -------------------------------------------------------------
 */

module.exports = {

  runLifestyleAgent,

  /*
   * Compatibility aliases.
   */

  generateLifestyleRecommendations:
    runLifestyleAgent,

  generateRecommendations:
    runLifestyleAgent

};


/*
 * -------------------------------------------------------------
 * CLI TEST
 * -------------------------------------------------------------
 *
 * Run:
 *
 * node index.js
 *
 * -------------------------------------------------------------
 */

if (require.main === module) {

  runLifestyleAgent({

    message:
      "Find me a suitable property in Nairobi and women-only transport."

  })

    .then(result => {

      console.log(
        "\n=============================================="
      );

      console.log(
        "RIDE2VIEW LIFESTYLE AGENT"
      );

      console.log(
        "=============================================="
      );

      console.log(
        JSON.stringify(
          result,
          null,
          2
        )
      );

      console.log(
        "==============================================\n"
      );

    })

    .catch(error => {

      console.error(
        "[CLI] Fatal error:",
        error
      );

      process.exit(1);

    });

}
