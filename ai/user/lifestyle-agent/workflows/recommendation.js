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
 * Formatting
 *    ↓
 * Recommendations
 *
 * The workflow orchestrates the complete agent pipeline.
 *
 * Important:
 *
 * - Core ranking remains deterministic.
 * - Lifestyle Utility remains available as intelligence.
 * - Explicit user intent such as "most affordable" can
 *   influence the final presentation order.
 * - User constraints are preserved in the final result.
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
 * Normalize arrays safely.
 */
function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}


/**
 * Safely convert a value to a finite number.
 */
function toFiniteNumber(
  value,
  fallback = null
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Extract a property price from the different
 * structures that may exist in an opportunity.
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
 * Extract bedrooms from an opportunity.
 *
 * Different pipeline stages may represent the
 * property differently, so normalize the value.
 */
function getBedrooms(item) {

  if (
    Number.isFinite(
      Number(item?.property?.bedrooms)
    )
  ) {
    return Number(
      item.property.bedrooms
    );
  }

  if (
    Number.isFinite(
      Number(item?.bedrooms)
    )
  ) {
    return Number(
      item.bedrooms
    );
  }

  if (
    Number.isFinite(
      Number(item?.property?.bedroomCount)
    )
  ) {
    return Number(
      item.property.bedroomCount
    );
  }

  return null;
}


/**
 * Normalize the property structure so downstream
 * tests, formatters and consumers can consistently
 * access:
 *
 * item.property.bedrooms
 * item.property.price
 */
function normalizePropertyStructure(
  opportunity = {}
) {

  const safeOpportunity =
    opportunity &&
    typeof opportunity === "object"
      ? opportunity
      : {};


  const existingProperty =
    safeOpportunity.property &&
    typeof safeOpportunity.property === "object"
      ? safeOpportunity.property
      : {};


  const bedrooms =
    getBedrooms(
      safeOpportunity
    );


  const price =
    getPrice(
      safeOpportunity
    );


  const normalizedProperty = {

    ...existingProperty

  };


  if (
    bedrooms !== null
  ) {

    normalizedProperty.bedrooms =
      bedrooms;

  }


  if (
    price !== null &&
    typeof normalizedProperty.price !== "number"
  ) {

    normalizedProperty.price =
      price;

  }


  return {

    ...safeOpportunity,

    property:
      Object.keys(normalizedProperty).length > 0
        ? normalizedProperty
        : safeOpportunity.property

  };
}


/**
 * Normalize all opportunities into a stable
 * downstream representation.
 */
function normalizeOpportunities(
  opportunities = []
) {

  return normalizeArray(
    opportunities
  ).map(
    opportunity =>
      normalizePropertyStructure(
        opportunity
      )
  );
}


/**
 * Convert a request/context object into searchable
 * text for lightweight intent detection.
 */
function getContextSearchText(
  context = {}
) {

  const request =
    context?.request &&
    typeof context.request === "object"
      ? context.request
      : {};

  return JSON.stringify({
    context,
    request
  }).toLowerCase();
}


/**
 * Determine whether the user explicitly requested
 * affordability / cheapest-first behavior.
 *
 * This is intentionally based on explicit intent,
 * rather than making every property search
 * price-ranked.
 */
function wantsCheapestFirst(
  context = {}
) {

  const text =
    getContextSearchText(
      context
    );


  const explicitAffordableLanguage = [

    "most affordable",
    "most affordable suitable",
    "cheapest",
    "cheapest suitable",
    "lowest price",
    "lowest priced",
    "lowest-cost",
    "lowest cost",
    "best price",
    "best priced",
    "affordable property"

  ];


  return explicitAffordableLanguage.some(
    phrase =>
      text.includes(phrase)
  );
}


/**
 * Determine whether the request contains a viewing
 * time constraint.
 */
function getMaxViewingTime(
  context = {}
) {

  const direct =
    toFiniteNumber(
      context?.maxViewingTime,
      null
    );

  if (
    direct !== null
  ) {
    return direct;
  }


  const nested =
    toFiniteNumber(
      context?.constraints?.maxViewingTime,
      null
    );

  if (
    nested !== null
  ) {
    return nested;
  }


  const text =
    getContextSearchText(
      context
    );


  if (
    text.includes("one hour") ||
    text.includes("1 hour") ||
    text.includes("60 minutes") ||
    text.includes("60 min")
  ) {

    return 60;

  }


  return null;
}


/**
 * Add normalized user constraints to every
 * recommendation without destroying existing data.
 */
function attachConstraintIntelligence(
  opportunity,
  context = {}
) {

  const maxViewingTime =
    getMaxViewingTime(
      context
    );


  const normalized =
    normalizePropertyStructure(
      opportunity
    );


  const result = {

    ...normalized

  };


  if (
    maxViewingTime !== null
  ) {

    result.maxViewingTime =
      maxViewingTime;

    result.viewingTimeLimit =
      maxViewingTime;

    result.viewingTimeConstraint =
      `${maxViewingTime} minutes`;

  }


  return result;
}


/* =========================================================
   SCORE OPPORTUNITIES
========================================================= */

function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeOpportunities(
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

function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeOpportunities(
      opportunities
    );


  const ranked =
    rankOpportunities(
      normalized,
      context
    );


  return ranked.map(
    (opportunity, index) => ({

      ...normalizePropertyStructure(
        opportunity
      ),

      rank:
        index + 1

    })
  );
}


/* =========================================================
   EXPLICIT AFFORDABILITY ORDER
========================================================= */

/**
 * Apply explicit cheapest-first intent.
 *
 * IMPORTANT:
 *
 * We do NOT globally change the scoring model.
 *
 * This only activates when the user explicitly asks
 * for the most affordable / cheapest option.
 *
 * This prevents an ordinary property search from
 * becoming a price-only ranking.
 */
function applyExplicitIntentOrdering(
  recommendations = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      recommendations
    );


  if (
    !wantsCheapestFirst(
      context
    )
  ) {

    return normalized;

  }


  const sorted =
    normalized
      .slice()
      .sort(
        (a, b) => {

          const priceA =
            getPrice(a);

          const priceB =
            getPrice(b);


          /*
           * Priced opportunities come first.
           */
          if (
            priceA === null &&
            priceB !== null
          ) {

            return 1;

          }


          if (
            priceA !== null &&
            priceB === null
          ) {

            return -1;

          }


          /*
           * If both are unpriced, retain their
           * existing deterministic order.
           */
          if (
            priceA === null &&
            priceB === null
          ) {

            return 0;

          }


          /*
           * Lowest price first.
           */
          if (
            priceA !== priceB
          ) {

            return priceA - priceB;

          }


          /*
           * Existing rank becomes the first
           * deterministic tie-breaker.
           */
          const rankA =
            toFiniteNumber(
              a?.rank,
              Number.POSITIVE_INFINITY
            );

          const rankB =
            toFiniteNumber(
              b?.rank,
              Number.POSITIVE_INFINITY
            );


          if (
            rankA !== rankB
          ) {

            return rankA - rankB;

          }


          /*
           * Final deterministic tie-breaker.
           */
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
   * Reassign rank after the explicit intent
   * ordering has been applied.
   */
  return sorted.map(
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
      opportunity => {

        const price =
          getPrice(
            opportunity
          );

        return (
          typeof price === "number" &&
          price > budget
        );

      }
    )

    .slice()

    .sort(
      (a, b) =>
        getPrice(a) -
        getPrice(b)
    )

    .slice(0, 3)

    .map(
      opportunity => {

        const price =
          getPrice(
            opportunity
          );


        return {

          id:
            opportunity.id,

          title:
            opportunity.title,

          price,

          budgetGap:
            price - budget,

          location:
            opportunity?.location?.city ||
            null

        };

      }
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
    toFiniteNumber(
      context?.budget,
      null
    );


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
    normalizeArray(
      recommendations
    ).filter(
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

function buildRecommendations(
  opportunities = [],
  context = {}
) {

  const scored =
    scoreRecommendations(
      opportunities,
      context
    );


  const ranked =
    rankRecommendations(
      scored,
      context
    );


  return applyExplicitIntentOrdering(
    ranked,
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
      ? {
          ...input.context,

          /*
           * Preserve request text for intent
           * detection and downstream intelligence.
           */
          request:
            input?.request ||
            input.context.request ||
            null

        }
      : {
          ...input,

          request:
            input?.request ||
            null

        };


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
    normalizeOpportunities(
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
    normalizeOpportunities(
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


  console.log(
    "[Lifestyle Recommendation] Ranking complete:",
    ranking.count
  );


  /* =======================================================
     5. FORMATTING
  ======================================================= */

  let formattedRecommendations;


  try {

    formattedRecommendations =
      formatRecommendations(
        rankedRecommendations,
        context
      );

  } catch (error) {

    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error
    );


    formattedRecommendations =
      rankedRecommendations;

  }


  let recommendations =
    normalizeArray(
      formattedRecommendations
    )
      .map(
        opportunity =>
          attachConstraintIntelligence(
            opportunity,
            context
          )
      );


  /* =======================================================
     6. EXPLICIT USER INTENT ORDERING
  ======================================================= */

  recommendations =
    applyExplicitIntentOrdering(
      recommendations,
      context
    );


  /*
   * The formatter may create a different object shape.
   * Re-apply the normalized property structure after
   * formatting and ordering.
   */
  recommendations =
    recommendations.map(
      (opportunity, index) => ({

        ...attachConstraintIntelligence(
          opportunity,
          context
        ),

        rank:
          index + 1

      })
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
     7. PRIMARY RECOMMENDATION
  ======================================================= */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /* =======================================================
     8. BUDGET ANALYSIS
  ======================================================= */

  const budgetAnalysis =
    buildBudgetAnalysis(
      recommendations,
      context
    );


  /* =======================================================
     9. SUMMARY
  ======================================================= */

  const summary =
    buildSummary(
      recommendations,
      context
    );


  /* =======================================================
     10. NEXT ACTION
  ======================================================= */

  const nextAction =
    buildNextAction(
      recommendations,
      context
    );


  /* =======================================================
     11. VIEWING-TIME INTELLIGENCE
  ======================================================= */

  const maxViewingTime =
    getMaxViewingTime(
      context
    );


  const viewingConstraints = {

    provided:
      maxViewingTime !== null,

    maxViewingTime

  };


  /* =======================================================
     12. FINAL RESULT
  ======================================================= */

  const result = {

    success:
      true,

    /*
     * Preserve normalized context in the result.
     *
     * This makes user constraints observable to
     * downstream consumers and test suites.
     */
    context: {

      ...context,

      maxViewingTime:
        maxViewingTime !== null
          ? maxViewingTime
          : context?.maxViewingTime

    },

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

    /* Viewing intelligence */

    viewingConstraints,

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

  buildBudgetAlternatives,

  buildBudgetAnalysis,

  buildSummary,

  buildNextAction,

  getPrice,

  getBedrooms,

  normalizePropertyStructure,

  getMaxViewingTime,

  wantsCheapestFirst

};
