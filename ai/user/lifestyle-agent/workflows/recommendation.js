/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Opportunity Scoring
 *    ↓
 * Lifestyle Utility
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
 *
 * The workflow orchestrates the agent.
 *
 * Discovery:
 * ../tools/opportunity-discovery
 *
 * Scoring + Ranking:
 * ../models/opportunity-scoring
 */


/* =========================================================
   IMPORTS
   ========================================================= */

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");

const {
  scoreOpportunity,
  rankOpportunities
} = require("../models/opportunity-scoring");


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}


function getPrice(item) {

  if (typeof item?.price === "number") {
    return item.price;
  }

  if (
    typeof item?.property?.price === "number"
  ) {
    return item.property.price;
  }

  return null;
}


/* =========================================================
   SCORE OPPORTUNITIES
   ========================================================= */

function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(opportunities);

  return normalized.map(
    opportunity =>
      scoreOpportunity(
        opportunity,
        context
      )
  );
}


/* =========================================================
   RANK OPPORTUNITIES
   ========================================================= */

function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(opportunities);

  const ranked =
    rankOpportunities(
      normalized,
      context
    );

  return ranked.map(
    (opportunity, index) => ({
      ...opportunity,

      rank:
        index + 1
    })
  );
}


/* =========================================================
   BUDGET ALTERNATIVES
   ========================================================= */

function buildBudgetAlternatives(
  recommendations = [],
  budget = null
) {

  if (
    budget === null ||
    !Array.isArray(recommendations)
  ) {
    return [];
  }

  return recommendations
    .filter(
      opportunity =>
        typeof getPrice(opportunity) === "number" &&
        getPrice(opportunity) > budget
    )
    .slice()
    .sort(
      (a, b) =>
        getPrice(a) -
        getPrice(b)
    )
    .slice(0, 3)
    .map(
      opportunity => ({

        id:
          opportunity.id,

        title:
          opportunity.title,

        price:
          getPrice(opportunity),

        budgetGap:
          getPrice(opportunity) - budget,

        location:
          opportunity?.location?.city || null

      })
    );
}


/* =========================================================
   BUDGET ANALYSIS
   ========================================================= */

function buildBudgetAnalysis(
  recommendations = [],
  context = {}
) {

  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;

  if (budget === null) {

    return {

      budgetProvided:
        false,

      budget:
        null,

      affordableCount:
        0,

      exactMatch:
        false,

      alternatives:
        []

    };
  }


  const priced =
    recommendations.filter(
      opportunity =>
        typeof getPrice(opportunity) === "number"
    );


  const affordable =
    priced.filter(
      opportunity =>
        getPrice(opportunity) <= budget
    );


  const alternatives =
    buildBudgetAlternatives(
      recommendations,
      budget
    );


  return {

    budgetProvided:
      true,

    budget,

    pricedCount:
      priced.length,

    affordableCount:
      affordable.length,

    exactMatch:
      affordable.length > 0,

    alternatives

  };
}


/* =========================================================
   BUILD SUMMARY
   ========================================================= */

function buildSummary(
  recommendations = [],
  context = {}
) {

  const budgetAnalysis =
    buildBudgetAnalysis(
      recommendations,
      context
    );


  if (
    budgetAnalysis.budgetProvided &&
    budgetAnalysis.exactMatch
  ) {

    return null;
  }


  if (
    budgetAnalysis.budgetProvided &&
    !budgetAnalysis.exactMatch &&
    budgetAnalysis.alternatives.length > 0
  ) {

    const closest =
      budgetAnalysis.alternatives[0];


    return (
      `No suitable property was found within the KSh ${budgetAnalysis.budget} budget. ` +
      `The closest available alternative is "${closest.title}" at KSh ${closest.price}, ` +
      `which is KSh ${closest.budgetGap} above the budget.`
    );
  }


  if (
    budgetAnalysis.budgetProvided &&
    !budgetAnalysis.exactMatch
  ) {

    return (
      `No suitable property was found within the KSh ${budgetAnalysis.budget} budget.`
    );
  }


  if (
    recommendations.length === 0
  ) {

    return (
      "No suitable opportunities were found for the current request."
    );
  }


  return null;
}


/* =========================================================
   BUILD NEXT ACTION
   ========================================================= */

function buildNextAction(
  recommendations = [],
  context = {}
) {

  const budgetAnalysis =
    buildBudgetAnalysis(
      recommendations,
      context
    );


  if (
    budgetAnalysis.budgetProvided &&
    !budgetAnalysis.exactMatch &&
    budgetAnalysis.alternatives.length > 0
  ) {

    return {

      action:
        "increase_budget",

      label:
        "View closest alternatives",

      alternatives:
        budgetAnalysis.alternatives

    };
  }


  if (
    recommendations.length > 0
  ) {

    return {

      action:
        "view_recommendation",

      label:
        "View recommended property"

    };
  }


  return {

    action:
      "refine_search",

    label:
      "Refine property search"

  };
}


/* =========================================================
   BUILD RECOMMENDATIONS
   ========================================================= */

function buildRecommendations(
  opportunities = [],
  context = {}
) {

  const scored =
    scoreRecommendations(
      opportunities,
      context
    );

  return rankRecommendations(
    scored,
    context
  );
}


/* =========================================================
   GENERATE LIFESTYLE RECOMMENDATIONS
   ========================================================= */

async function generateLifestyleRecommendations(
  input = {}
) {

  /*
   * -------------------------------------------------------
   * CONTEXT
   * -------------------------------------------------------
   */

  const context =
    input?.context &&
    typeof input.context === "object"
      ? input.context
      : input;


  console.log(
    "[Lifestyle Recommendation] Starting workflow."
  );


  /* =======================================================
     1. DISCOVERY
     ======================================================= */

  let discovery;


  try {

    discovery =
      await discoverOpportunities(
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Discovery failed:",
      error
    );


    return {

      success:
        false,

      discovery: {

        success:
          false,

        opportunities:
          [],

        count:
          0,

        error:
          error.message

      },

      reasoning: {

        enabled:
          false,

        success:
          false,

        opportunities:
          []

      },

      scoring: {

        success:
          false,

        opportunities:
          []

      },

      ranking: {

        success:
          false,

        opportunities:
          []

      },

      recommendations:
        [],

      count:
        0,

      primary:
        null,

      summary:
        "Opportunity discovery failed.",

      nextAction:
        {

          action:
            "retry",

          label:
            "Retry recommendation search"

        }

    };
  }


  const discoveredOpportunities =
    normalizeArray(
      discovery?.opportunities
    );


  console.log(
    "[Lifestyle Recommendation] Discovery complete:",
    discoveredOpportunities.length
  );


  /* =======================================================
     2. REASONING
     ======================================================= */

  /*
   * Reasoning integration is deliberately isolated here.
   *
   * Until the existing reasoning-engine.js contract is
   * confirmed, discovery results are preserved as the
   * reasoning input rather than inventing a new API.
   *
   * This keeps the workflow functional while exposing
   * the reasoning stage to the test.
   */

  const reasoningOpportunities =
    discoveredOpportunities;


  const reasoning = {

    enabled:
      false,

    success:
      true,

    opportunities:
      reasoningOpportunities,

    count:
      reasoningOpportunities.length,

    status:
      "pending-engine-integration"

  };


  /* =======================================================
     3. SCORING
     ======================================================= */

  const scoredRecommendations =
    scoreRecommendations(
      reasoningOpportunities,
      context
    );


  const scoring = {

    success:
      true,

    opportunities:
      scoredRecommendations,

    count:
      scoredRecommendations.length

  };


  /* =======================================================
     4. RANKING
     ======================================================= */

  const rankedRecommendations =
    rankRecommendations(
      scoredRecommendations,
      context
    );


  const ranking = {

    success:
      true,

    opportunities:
      rankedRecommendations,

    count:
      rankedRecommendations.length

  };


  /* =======================================================
     5. PRIMARY RECOMMENDATION
     ======================================================= */

  const primary =
    rankedRecommendations.length > 0
      ? rankedRecommendations[0]
      : null;


  /* =======================================================
     6. BUDGET ANALYSIS
     ======================================================= */

  const budgetAnalysis =
    buildBudgetAnalysis(
      rankedRecommendations,
      context
    );


  /* =======================================================
     7. SUMMARY
     ======================================================= */

  const summary =
    buildSummary(
      rankedRecommendations,
      context
    );


  /* =======================================================
     8. NEXT ACTION
     ======================================================= */

  const nextAction =
    buildNextAction(
      rankedRecommendations,
      context
    );


  /* =======================================================
     9. FINAL RESULT
     ======================================================= */

  const result = {

    success:
      true,


    /*
     * Pipeline stages
     */

    discovery,

    reasoning,

    scoring,

    ranking,


    /*
     * Final recommendations
     */

    recommendations:
      rankedRecommendations,

    count:
      rankedRecommendations.length,

    primary,


    /*
     * Budget intelligence
     */

    budgetAnalysis,


    /*
     * User-facing guidance
     */

    summary,

    nextAction

  };


  console.log(
    "[Lifestyle Recommendation] Workflow complete:",
    {
      discovery:
        result.discovery?.count,

      reasoning:
        result.reasoning?.count,

      scoring:
        result.scoring?.count,

      ranking:
        result.ranking?.count,

      recommendations:
        result.recommendations.length
    }
  );


  return result;
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
