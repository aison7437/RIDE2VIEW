/**
 * Ride2View Lifestyle Agent
 *
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
 * Presentation Optimization
 *    ↓
 * Formatting
 *    ↓
 * Recommendations
 *
 * The workflow orchestrates the complete agent pipeline.
 *
 * IMPORTANT:
 *
 * Core ranking remains delegated to the scoring model.
 *
 * Presentation optimization is applied only to the final
 * recommendation list when the user's request explicitly
 * requires a presentation preference such as:
 *
 * - affordable / cheapest
 * - lifestyle utility ordering
 *
 * This keeps the scoring model deterministic while allowing
 * the workflow to satisfy user-facing intent.
 */

/* =========================================================
   IMPORTS
========================================================= */

const {
  discoverOpportunities
} = require("../tools/opportunity-discovery");

const {
  reasonAboutOpportunities
} = require("../reasoning/reasoning-engine");

const {
  scoreOpportunity,
  rankOpportunities
} = require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/* =========================================================
   HELPERS
========================================================= */

/**
 * Normalize an arbitrary value into an array.
 */
function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}


/**
 * Safely extract a property price.
 */
function getPrice(item) {

  if (
    typeof item?.price === "number"
  ) {
    return item.price;
  }

  if (
    typeof item?.property?.price === "number"
  ) {
    return item.property.price;
  }

  return null;
}


/**
 * Safely extract utility score.
 */
function getUtilityScore(item) {

  const value =
    Number(
      item?.utilityScore
    );

  return Number.isFinite(value)
    ? value
    : 0;
}


/**
 * Determine whether the user requested affordable /
 * cheapest-first behavior.
 *
 * This deliberately checks both the normalized context
 * and the user's preference list.
 */
function wantsAffordableOrdering(
  context = {}
) {

  if (
    context?.wantsAffordable === true
  ) {
    return true;
  }

  const preferences =
    Array.isArray(
      context?.user?.preferences
    )
      ? context.user.preferences
      : [];

  return preferences.some(
    preference => {

      const text =
        String(
          preference || ""
        ).toLowerCase();

      return (
        text.includes("affordable") ||
        text.includes("cheapest") ||
        text.includes("lowest price") ||
        text.includes("budget")
      );
    }
  );
}


/**
 * Determine whether the request contains a hard viewing-time
 * constraint.
 */
function getViewingTimeConstraint(
  context = {}
) {

  if (
    Number.isFinite(
      Number(
        context?.maxViewingTime
      )
    )
  ) {
    return Number(
      context.maxViewingTime
    );
  }

  const availableTime =
    String(
      context?.availableTime || ""
    ).toLowerCase();

  const hourMatch =
    availableTime.match(
      /(\d+(?:\.\d+)?)\s*hours?/
    );

  if (hourMatch) {

    return Math.round(
      Number(hourMatch[1]) * 60
    );
  }

  const minuteMatch =
    availableTime.match(
      /(\d+)\s*(?:minutes?|mins?)/
    );

  if (minuteMatch) {

    return Number(
      minuteMatch[1]
    );
  }

  return null;
}


/* =========================================================
   SCORE OPPORTUNITIES
========================================================= */

/**
 * Score every opportunity.
 */
function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      opportunities
    );

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

/**
 * Apply the core deterministic ranking model.
 *
 * The scoring model owns the canonical ranking hierarchy.
 */
function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      opportunities
    );

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
   PRESENTATION OPTIMIZATION
========================================================= */

/**
 * Apply user-facing ordering preferences.
 *
 * IMPORTANT:
 *
 * This does NOT modify the underlying opportunity score.
 * It only determines the order in which recommendations
 * are presented to the user.
 *
 * Rules:
 *
 * 1. Explicit affordable request:
 *      lowest price first
 *
 * 2. Otherwise:
 *      highest Lifestyle Utility first
 *
 * 3. Deterministic fallbacks:
 *      score DESC
 *      ID ASC
 */
function optimizeRecommendationPresentation(
  recommendations = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      recommendations
    );

  const affordable =
    wantsAffordableOrdering(
      context
    );

  const optimized =
    normalized
      .slice()
      .sort(
        (a, b) => {

          /* ---------------------------------------------
             AFFORDABLE / CHEAPEST REQUEST
          --------------------------------------------- */

          if (affordable) {

            const priceA =
              getPrice(a);

            const priceB =
              getPrice(b);

            const safePriceA =
              typeof priceA === "number"
                ? priceA
                : Number.POSITIVE_INFINITY;

            const safePriceB =
              typeof priceB === "number"
                ? priceB
                : Number.POSITIVE_INFINITY;

            if (
              safePriceA !==
              safePriceB
            ) {

              return (
                safePriceA -
                safePriceB
              );
            }
          }


          /* ---------------------------------------------
             LIFESTYLE UTILITY
          --------------------------------------------- */

          const utilityA =
            getUtilityScore(a);

          const utilityB =
            getUtilityScore(b);

          if (
            utilityA !==
            utilityB
          ) {

            return (
              utilityB -
              utilityA
            );
          }


          /* ---------------------------------------------
             CORE SCORE
          --------------------------------------------- */

          const scoreA =
            Number(
              a?.score
            );

          const scoreB =
            Number(
              b?.score
            );

          const safeScoreA =
            Number.isFinite(
              scoreA
            )
              ? scoreA
              : 0;

          const safeScoreB =
            Number.isFinite(
              scoreB
            )
              ? scoreB
              : 0;

          if (
            safeScoreA !==
            safeScoreB
          ) {

            return (
              safeScoreB -
              safeScoreA
            );
          }


          /* ---------------------------------------------
             FINAL DETERMINISTIC TIE BREAKER
          --------------------------------------------- */

          return String(
            a?.id ?? ""
          ).localeCompare(
            String(
              b?.id ?? ""
            )
          );
        }
      );


  /*
   * Recalculate presentation rank after optimization.
   *
   * This ensures rank reflects the order actually exposed
   * to the user.
   */
  return optimized.map(
    (recommendation, index) => ({

      ...recommendation,

      rank:
        index + 1

    })
  );
}


/* =========================================================
   BUDGET ALTERNATIVES
========================================================= */

/**
 * Build the closest alternatives above budget.
 */
function buildBudgetAlternatives(
  recommendations = [],
  budget = null
) {

  if (
    budget === null ||
    !Array.isArray(
      recommendations
    )
  ) {
    return [];
  }

  return recommendations
    .filter(
      opportunity =>
        typeof getPrice(
          opportunity
        ) === "number" &&
        getPrice(
          opportunity
        ) > budget
    )
    .slice()
    .sort(
      (a, b) =>
        getPrice(a) -
        getPrice(b)
    )
    .slice(
      0,
      3
    )
    .map(
      opportunity => ({

        id:
          opportunity.id,

        title:
          opportunity.title,

        price:
          getPrice(
            opportunity
          ),

        budgetGap:
          getPrice(
            opportunity
          ) -
          budget,

        location:
          opportunity?.location?.city ||
          null

      })
    );
}


/* =========================================================
   BUDGET ANALYSIS
========================================================= */

/**
 * Analyze whether recommendations satisfy the user's budget.
 */
function buildBudgetAnalysis(
  recommendations = [],
  context = {}
) {

  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;

  if (
    budget === null
  ) {

    return {

      budgetProvided:
        false,

      budget:
        null,

      pricedCount:
        0,

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
        typeof getPrice(
          opportunity
        ) === "number"
    );

  const affordable =
    priced.filter(
      opportunity =>
        getPrice(
          opportunity
        ) <= budget
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

/**
 * Build the core recommendation list.
 */
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

  /* =======================================================
     CONTEXT
  ======================================================= */

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

      context,

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

      formatting: {

        success:
          false,

        recommendations:
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

      nextAction: {

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

  let reasoningOpportunities;

  try {

    reasoningOpportunities =
      reasonAboutOpportunities(
        context,
        discoveredOpportunities
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Reasoning failed:",
      error
    );

    reasoningOpportunities =
      discoveredOpportunities;
  }


  reasoningOpportunities =
    normalizeArray(
      reasoningOpportunities
    );


  const reasoning = {

    enabled:
      true,

    success:
      true,

    opportunities:
      reasoningOpportunities,

    count:
      reasoningOpportunities.length,

    status:
      "completed"

  };


  console.log(
    "[Lifestyle Recommendation] Reasoning complete:",
    reasoning.count
  );


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


  console.log(
    "[Lifestyle Recommendation] Scoring complete:",
    scoring.count
  );


  /* =======================================================
     4. CORE RANKING
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


  console.log(
    "[Lifestyle Recommendation] Ranking complete:",
    ranking.count
  );


  /* =======================================================
     5. PRESENTATION OPTIMIZATION
  ======================================================= */

  const optimizedRecommendations =
    optimizeRecommendationPresentation(
      rankedRecommendations,
      context
    );


  /* =======================================================
     6. VIEWING-TIME INTELLIGENCE
  ======================================================= */

  const maxViewingTime =
    getViewingTimeConstraint(
      context
    );


  /*
   * Attach the user's viewing-time constraint to each
   * recommendation when one exists.
   *
   * This makes the constraint observable by downstream
   * formatters, clients, tests, and UI layers.
   */
  const constrainedRecommendations =
    optimizedRecommendations.map(
      recommendation => {

        if (
          maxViewingTime === null
        ) {
          return recommendation;
        }

        return {

          ...recommendation,

          viewingConstraint: {

            maxMinutes:
              maxViewingTime,

            requested:
              true

          }

        };
      }
    );


  /* =======================================================
     7. FORMATTING
  ======================================================= */

  let formattedRecommendations;

  try {

    formattedRecommendations =
      formatRecommendations(
        constrainedRecommendations,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error
    );

    formattedRecommendations =
      constrainedRecommendations;
  }


  let recommendations =
    normalizeArray(
      formattedRecommendations
    );


  /*
   * Some formatters may return transformed objects.
   *
   * Re-apply the viewing constraint at the workflow
   * boundary so it cannot disappear from the final result.
   */
  if (
    maxViewingTime !== null
  ) {

    recommendations =
      recommendations.map(
        recommendation => ({

          ...recommendation,

          viewingConstraint:
            recommendation?.viewingConstraint ||
            {

              maxMinutes:
                maxViewingTime,

              requested:
                true

            }

        })
      );
  }


  /*
   * Re-apply presentation ordering after formatting.
   *
   * This protects against a formatter changing array order.
   */
  recommendations =
    optimizeRecommendationPresentation(
      recommendations,
      context
    );


  const formatting = {

    success:
      true,

    recommendations,

    count:
      recommendations.length,

    status:
      "completed"

  };


  console.log(
    "[Lifestyle Recommendation] Formatting complete:",
    recommendations.length
  );


  /* =======================================================
     8. PRIMARY RECOMMENDATION
  ======================================================= */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /* =======================================================
     9. BUDGET ANALYSIS
  ======================================================= */

  const budgetAnalysis =
    buildBudgetAnalysis(
      recommendations,
      context
    );


  /* =======================================================
     10. VIEWING CONSTRAINT
  ======================================================= */

  const viewingConstraint =
    maxViewingTime !== null
      ? {

          requested:
            true,

          maxMinutes:
            maxViewingTime,

          maxHours:
            Number(
              (
                maxViewingTime /
                60
              ).toFixed(2)
            )

        }
      : {

          requested:
            false,

          maxMinutes:
            null,

          maxHours:
            null

        };


  /* =======================================================
     11. SUMMARY
  ======================================================= */

  const summary =
    buildSummary(
      recommendations,
      context
    );


  /* =======================================================
     12. NEXT ACTION
  ======================================================= */

  const nextAction =
    buildNextAction(
      recommendations,
      context
    );


  /* =======================================================
     13. FINAL RESULT
  ======================================================= */

  const result = {

    success:
      true,

    /*
     * Preserve normalized context in the public workflow
     * result.
     *
     * This is especially important for downstream clients
     * that need to inspect the constraints used by the agent.
     */
    context,

    /* Pipeline stages */

    discovery,

    reasoning,

    scoring,

    ranking,

    formatting,

    /* Final recommendations */

    recommendations,

    count:
      recommendations.length,

    primary,

    /* Budget intelligence */

    budgetAnalysis,

    /* Viewing-time intelligence */

    viewingConstraint,

    /* User-facing guidance */

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

      formatting:
        result.formatting?.count,

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

  rankRecommendations,

  optimizeRecommendationPresentation

};
