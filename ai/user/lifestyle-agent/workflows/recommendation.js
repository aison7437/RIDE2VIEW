/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * Context
 *   ↓
 * Opportunity Discovery
 *   ↓
 * AI Reasoning Engine
 *   ↓
 * Utility Scoring
 *   ↓
 * Ranking
 *   ↓
 * Structured Recommendations
 */

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");

const {
  reasonAboutOpportunities
} = require("../reasoning/reasoning-engine");

const {
  evaluateUtility,
  rankByUtility
} = require("../models/utility-scoring");


/**
 * Generate lifestyle recommendations.
 *
 * Supports:
 *
 * 1. New Lifestyle Agent format:
 *
 * {
 *   message,
 *   intent,
 *   segment,
 *   preferences
 * }
 *
 * 2. Legacy workflow format:
 *
 * {
 *   request: {
 *     ...
 *   }
 * }
 *
 * @param {Object} workflowInput
 * @returns {Object}
 */
async function generateLifestyleRecommendations(
  workflowInput = {}
) {

  /*
   * ==========================================
   * NORMALIZE INPUT
   * ==========================================
   */

  const inputContext =
    workflowInput.context || {};


  /*
   * IMPORTANT:
   *
   * index.js currently sends the enriched request
   * directly into this function.
   *
   * Therefore, if no nested request exists,
   * workflowInput itself IS the request.
   */

  const request =
    workflowInput.request ||
    inputContext.request ||
    workflowInput;


  const user =
    workflowInput.user ||
    inputContext.user ||
    {};


  /*
   * ==========================================
   * EXTRACT INTENT
   * ==========================================
   */

  const intent =
    request.intent ||
    inputContext.intent ||
    {};


  /*
   * ==========================================
   * BUILD NORMALIZED REQUEST
   * ==========================================
   */

  const normalizedRequest = {

    ...request,

    /*
     * Original user message
     */
    message:
      request.message ||
      intent.rawMessage ||
      "",


    /*
     * Normalized intent
     */
    intent,


    /*
     * Main goal
     */
    userGoal:
      request.userGoal ||
      (
        intent.wantsProperty
          ? "property"
          : intent.wantsMobility
            ? "mobility"
            : intent.wantsFood
              ? "food"
              : intent.wantsShopping
                ? "shopping"
                : "general"
      ),


    /*
     * Segment
     */
    segment:
      request.segment ||
      intent.segment ||
      "general",


    /*
     * Multiple segments
     */
    segments:
      request.segments ||
      intent.segments ||
      [
        intent.segment ||
        "general"
      ],


    /*
     * Services
     */
    services:
      request.services ||
      intent.services ||
      [],


    /*
     * Preferences
     */
    preferences:
      request.preferences ||
      [],


    /*
     * Budget
     */
    budget:
      request.budget ??
      intent.budget ??
      null,


    /*
     * Bedrooms
     */
    bedrooms:
      request.bedrooms ??
      intent.bedrooms ??
      null,


    /*
     * Location
     */
    location:
      request.location ||
      intent.location ||
      null,


    /*
     * Property
     */
    wantsProperty:
      request.wantsProperty ??
      intent.wantsProperty ??
      false,


    /*
     * Mobility
     */
    wantsMobility:
      request.wantsMobility ??
      intent.wantsMobility ??
      false,


    /*
     * Student
     */
    wantsStudent:
      request.wantsStudent ??
      intent.wantsStudent ??
      false,


    /*
     * Women-only
     */
    wantsWomenOnly:
      request.wantsWomenOnly ??
      intent.wantsWomenOnly ??
      false,


    /*
     * VIP
     */
    wantsVIP:
      request.wantsVIP ??
      intent.wantsVIP ??
      false,


    /*
     * Premium
     */
    wantsPremium:
      request.wantsPremium ??
      intent.wantsPremium ??
      false,


    /*
     * Affordable
     */
    wantsAffordable:
      request.wantsAffordable ??
      intent.wantsAffordable ??
      false,


    /*
     * Budget optimization
     */
    wantsBudgetOptimization:
      request.wantsBudgetOptimization ??
      intent.wantsBudgetOptimization ??
      false,


    /*
     * Viewing time
     *
     * This is future-compatible with the
     * viewing-time intent field.
     */
    viewingTimeMinutes:
      request.viewingTimeMinutes ??
      intent.viewingTimeMinutes ??
      null

  };


  /*
   * ==========================================
   * BUILD NORMALIZED CONTEXT
   * ==========================================
   */

  const context = {

    ...inputContext,

    user,

    request:
      normalizedRequest,

    intent

  };


  /*
   * ==========================================
   * DEBUG LOGGING
   * ==========================================
   */

  console.log(
    "[Lifestyle Recommendation] Message:",
    normalizedRequest.message
  );


  console.log(
    "[Lifestyle Recommendation] Intent:",
    JSON.stringify(
      normalizedRequest.intent,
      null,
      2
    )
  );


  console.log(
    "[Lifestyle Recommendation] Segment:",
    normalizedRequest.segment
  );


  console.log(
    "[Lifestyle Recommendation] Services:",
    normalizedRequest.services
  );


  /*
   * ==========================================
   * OPPORTUNITY DISCOVERY
   * ==========================================
   */

  let discovery = {

    success: false,

    opportunities: [],

    count: 0

  };


  try {

    discovery =
      await discoverOpportunities(
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Discovery error:",
      error
    );


    discovery = {

      success: false,

      opportunities: [],

      count: 0,

      error:
        error.message

    };

  }


  /*
   * ==========================================
   * NORMALIZE DISCOVERY RESULTS
   * ==========================================
   */

  const opportunities =
    Array.isArray(
      discovery.opportunities
    )
      ? discovery.opportunities
      : [];


  /*
   * ==========================================
   * AI REASONING
   * ==========================================
   */

  let reasoningResults = [];

  let reasoningEnabled = false;


  if (
    opportunities.length > 0
  ) {

    try {

      reasoningResults =
        reasonAboutOpportunities(
          context,
          opportunities
        );


      if (
        Array.isArray(
          reasoningResults
        )
      ) {

        reasoningEnabled = true;

      }

    } catch (error) {

      console.error(
        "[Lifestyle Recommendation] Reasoning error:",
        error
      );


      reasoningResults = [];

      reasoningEnabled = false;

    }

  }


  /*
   * ==========================================
   * MERGE REASONING
   * ==========================================
   */

  const reasonedOpportunities =
    opportunities.map(
      (opportunity) => {

        const reasoning =
          reasoningResults.find(
            (item) =>
              item &&
              item.opportunity &&
              item.opportunity.id ===
                opportunity.id
          );


        if (!reasoning) {

          return opportunity;

        }


        return {

          ...opportunity,

          reasoningScore:
            reasoning.reasoningScore,

          reasoningFactors:
            reasoning.factors

        };

      }
    );


  /*
   * ==========================================
   * UTILITY SCORING
   * ==========================================
   */

  const scoredOpportunities =
    reasonedOpportunities.map(
      (opportunity) => {

        try {

          return evaluateUtility(
            opportunity,
            context
          );

        } catch (error) {

          console.error(
            "[Lifestyle Recommendation] Utility scoring error:",
            error
          );


          return {

            ...opportunity,

            utilityScore: 0,

            utilityLevel: "low",

            scoringError:
              error.message

          };

        }

      }
    );


  /*
   * ==========================================
   * UTILITY RANKING
   * ==========================================
   */

  let rankedOpportunities = [];


  try {

    rankedOpportunities =
      rankByUtility(
        scoredOpportunities,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Ranking error:",
      error
    );


    rankedOpportunities =
      scoredOpportunities;

  }


  /*
   * ==========================================
   * ADD FINAL RANK
   * ==========================================
   */

  const recommendations =
    rankedOpportunities.map(
      (opportunity, index) => ({

        ...opportunity,

        rank:
          index + 1

      })
    );


  /*
   * ==========================================
   * PRIMARY + ALTERNATIVES
   * ==========================================
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  const alternatives =
    recommendations.slice(1);


  /*
   * ==========================================
   * NEXT ACTION
   * ==========================================
   */

  let nextAction = {

    action: "none",

    label:
      "No recommendation available"

  };


  if (primary) {

    if (
      primary.type ===
      "property"
    ) {

      nextAction = {

        action:
          "view-property",

        label:
          "View property"

      };

    }

    else if (
      primary.type ===
      "mobility"
    ) {

      nextAction = {

        action:
          "book-ride",

        label:
          "Book ride"

      };

    }

    else {

      nextAction = {

        action:
          "view-recommendation",

        label:
          "View recommendation"

      };

    }

  }


  /*
   * ==========================================
   * SUMMARY
   * ==========================================
   */

  const summary = {

    total:
      recommendations.length,


    strongMatches:
      recommendations.filter(
        (item) =>
          item.relevance ===
          "high"
      ).length,


    excellentUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel ===
          "excellent"
      ).length,


    highUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel ===
          "high"
      ).length,


    moderateUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel ===
          "moderate"
      ).length,


    alternatives:
      alternatives.length

  };


  /*
   * ==========================================
   * RETURN
   * ==========================================
   */

  return {

    success: true,

    context,

    discovery: {

      success:
        discovery.success,

      count:
        opportunities.length

    },

    reasoning: {

      enabled:
        reasoningEnabled,

      count:
        reasoningResults.length

    },

    ranking: {

      count:
        recommendations.length

    },

    count:
      recommendations.length,

    primary,

    alternatives,

    recommendations,

    nextAction,

    summary,

    timestamp:
      new Date().toISOString()

  };

}


/*
 * ==========================================
 * EXPORT
 * ==========================================
 */

module.exports = {

  generateLifestyleRecommendations

};
