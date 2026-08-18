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

  const request =
    inputContext.request ||
    workflowInput.request ||
    {};

  const user =
    workflowInput.user ||
    inputContext.user ||
    {};


  /*
   * ==========================================
   * BUILD NORMALIZED CONTEXT
   * ==========================================
   */

  const context = {

    ...inputContext,

    user,

    request

  };


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

    discovery = {

      success: false,

      opportunities: [],

      count: 0,

      error: error.message

    };

  }


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

      reasoningResults = [];

      reasoningEnabled = false;

    }

  }


  /*
   * ==========================================
   * MERGE REASONING INTO OPPORTUNITIES
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
      (opportunity) =>
        evaluateUtility(
          opportunity,
          context
        )
    );


  /*
   * ==========================================
   * UTILITY RANKING
   * ==========================================
   */

  const rankedOpportunities =
    rankByUtility(
      scoredOpportunities,
      context
    );


  /*
   * ==========================================
   * ADD FINAL RANK
   * ==========================================
   */

  const recommendations =
    rankedOpportunities.map(
      (opportunity, index) => ({

        ...opportunity,

        rank: index + 1

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

    label: "No recommendation available"

  };


  if (primary) {

    if (
      primary.type === "property"
    ) {

      nextAction = {

        action: "view-property",

        label: "View property"

      };

    } else if (
      primary.type === "mobility"
    ) {

      nextAction = {

        action: "book-ride",

        label: "Book ride"

      };

    } else {

      nextAction = {

        action: "view-recommendation",

        label: "View recommendation"

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
          item.relevance === "high"
      ).length,

    excellentUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel === "excellent"
      ).length,

    highUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel === "high"
      ).length,

    moderateUtility:
      recommendations.filter(
        (item) =>
          item.utilityLevel === "moderate"
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


/**
 * Export workflow.
 */
module.exports = {

  generateLifestyleRecommendations

};
