/**
 * ============================================================
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 * ============================================================
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Opportunity Scoring
 *    ↓
 * Ranking
 *    ↓
 * Formatting
 *    ↓
 * Recommendations
 *
 * The workflow is responsible for orchestration.
 *
 * Important:
 *
 * - Discovery discovers opportunities.
 * - Reasoning enriches opportunities.
 * - Scoring calculates deterministic scores.
 * - Ranking establishes deterministic order.
 * - Formatting creates user-facing recommendations.
 *
 * The original ranked opportunity metadata is preserved after
 * formatting so downstream tests and consumers can still access:
 *
 * - property
 * - bedrooms
 * - location
 * - price
 * - budget
 * - requestedBudget
 * - requestedMaxViewingTime
 * - viewingTimeMinutes
 * - utilityScore
 * - utilityLevel
 * - utilityFactors
 * - utilityExplanation
 * - score
 * - matchPercentage
 * - budgetEfficiency
 * - rank
 *
 * ============================================================
 */


/* ============================================================
   IMPORTS
============================================================ */

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


/* ============================================================
   HELPERS
============================================================ */

function normalizeArray(value) {

  return Array.isArray(value)
    ? value
    : [];

}


/* ============================================================
   PRICE
============================================================ */

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


/* ============================================================
   NUMBER
============================================================ */

function toFiniteNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : fallback;

}


/* ============================================================
   SCORE RECOMMENDATIONS
============================================================ */

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


/* ============================================================
   RANK RECOMMENDATIONS
============================================================ */

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


/* ============================================================
   PRESERVE RANKED METADATA
============================================================ */

/**
 * Formatting is a presentation layer.
 *
 * It should never destroy the structured intelligence
 * produced by discovery, reasoning, scoring and ranking.
 *
 * Therefore we merge the original ranked opportunity
 * back into the formatted recommendation.
 */
function preserveOpportunityMetadata(
  formatted,
  ranked
) {

  const safeFormatted =
    formatted &&
    typeof formatted === "object"
      ? formatted
      : {};


  const safeRanked =
    ranked &&
    typeof ranked === "object"
      ? ranked
      : {};


  return {

    ...safeRanked,

    ...safeFormatted,


    /*
     * Explicitly preserve important structured fields.
     */

    id:
      safeFormatted.id ??
      safeRanked.id ??
      null,


    type:
      safeFormatted.type ??
      safeRanked.type ??
      null,


    category:
      safeFormatted.category ??
      safeRanked.category ??
      null,


    service:
      safeFormatted.service ??
      safeRanked.service ??
      null,


    title:
      safeFormatted.title ??
      safeRanked.title ??
      null,


    description:
      safeFormatted.description ??
      safeRanked.description ??
      null,


    location:
      safeFormatted.location ??
      safeRanked.location ??
      null,


    price:
      typeof safeFormatted.price === "number"
        ? safeFormatted.price
        : safeRanked.price ?? null,


    property:
      safeFormatted.property ??
      safeRanked.property ??
      null,


    tags:
      Array.isArray(safeFormatted.tags)
        ? safeFormatted.tags
        : safeRanked.tags ?? [],


    /*
     * Request intelligence
     */

    requestedBedrooms:
      safeFormatted.requestedBedrooms ??
      safeRanked.requestedBedrooms ??
      null,


    bedrooms:
      safeFormatted.bedrooms ??
      safeRanked.bedrooms ??
      safeRanked?.property?.bedrooms ??
      null,


    requestedNeighborhood:
      safeFormatted.requestedNeighborhood ??
      safeRanked.requestedNeighborhood ??
      null,


    requestedBudget:
      safeFormatted.requestedBudget ??
      safeRanked.requestedBudget ??
      null,


    requestedMaxViewingTime:
      safeFormatted.requestedMaxViewingTime ??
      safeRanked.requestedMaxViewingTime ??
      null,


    maxViewingTime:
      safeFormatted.maxViewingTime ??
      safeRanked.maxViewingTime ??
      null,


    viewingTimeMinutes:
      safeFormatted.viewingTimeMinutes ??
      safeRanked.viewingTimeMinutes ??
      null,


    /*
     * Compatibility signals
     */

    budget:
      safeFormatted.budget ??
      safeRanked.budget ??
      null,


    availableTime:
      safeFormatted.availableTime ??
      safeRanked.availableTime ??
      null,


    locationMatch:
      typeof safeFormatted.locationMatch === "boolean"
        ? safeFormatted.locationMatch
        : safeRanked.locationMatch ?? null,


    budgetCompatible:
      typeof safeFormatted.budgetCompatible === "boolean"
        ? safeFormatted.budgetCompatible
        : safeRanked.budgetCompatible ?? null,


    timeCompatible:
      typeof safeFormatted.timeCompatible === "boolean"
        ? safeFormatted.timeCompatible
        : safeRanked.timeCompatible ?? null,


    preferenceMatch:
      typeof safeFormatted.preferenceMatch === "boolean"
        ? safeFormatted.preferenceMatch
        : safeRanked.preferenceMatch ?? null,


    /*
     * Scenario intelligence
     */

    affordabilityRequested:
      safeFormatted.affordabilityRequested ??
      safeRanked.affordabilityRequested ??
      false,


    studentRequested:
      safeFormatted.studentRequested ??
      safeRanked.studentRequested ??
      false,


    premiumRequested:
      safeFormatted.premiumRequested ??
      safeRanked.premiumRequested ??
      false,


    mobilityRequested:
      safeFormatted.mobilityRequested ??
      safeRanked.mobilityRequested ??
      false,


    womenOnlyRequested:
      safeFormatted.womenOnlyRequested ??
      safeRanked.womenOnlyRequested ??
      false,


    womenOnly:
      typeof safeFormatted.womenOnly === "boolean"
        ? safeFormatted.womenOnly
        : safeRanked.womenOnly ?? false,


    /*
     * Scoring intelligence
     */

    score:
      toFiniteNumber(
        safeFormatted.score ??
        safeRanked.score,
        0
      ),


    reasoningScore:
      toFiniteNumber(
        safeFormatted.reasoningScore ??
        safeRanked.reasoningScore,
        0
      ),


    matchPercentage:
      toFiniteNumber(
        safeFormatted.matchPercentage ??
        safeRanked.matchPercentage,
        0
      ),


    budgetEfficiency:
      toFiniteNumber(
        safeFormatted.budgetEfficiency ??
        safeRanked.budgetEfficiency,
        0
      ),


    /*
     * Lifestyle Utility
     */

    utilityScore:
      toFiniteNumber(
        safeFormatted.utilityScore ??
        safeRanked.utilityScore,
        0
      ),


    utilityLevel:
      safeFormatted.utilityLevel ??
      safeRanked.utilityLevel ??
      "low",


    utilityFactors:
      Array.isArray(
        safeFormatted.utilityFactors
      )
        ? safeFormatted.utilityFactors
        : (
            Array.isArray(
              safeRanked.utilityFactors
            )
              ? safeRanked.utilityFactors
              : []
          ),


    utilityExplanation:
      safeFormatted.utilityExplanation ??
      safeRanked.utilityExplanation ??
      null,


    /*
     * Ranking
     */

    rank:
      safeFormatted.rank ??
      safeRanked.rank ??
      null

  };

}


/* ============================================================
   MATCH FORMATTED RECOMMENDATIONS
============================================================ */

/**
 * Match formatted recommendations back to their ranked
 * opportunity using the opportunity ID.
 *
 * If the formatter preserves IDs, this is exact.
 *
 * If it does not, positional fallback is used.
 */
function mergeFormattedRecommendations(
  formattedRecommendations = [],
  rankedRecommendations = []
) {

  const formatted =
    normalizeArray(
      formattedRecommendations
    );


  const ranked =
    normalizeArray(
      rankedRecommendations
    );


  if (
    formatted.length === 0
  ) {

    return ranked;

  }


  const rankedById =
    new Map();


  ranked.forEach(
    opportunity => {

      if (
        opportunity &&
        opportunity.id !== undefined &&
        opportunity.id !== null
      ) {

        rankedById.set(
          String(
            opportunity.id
          ),
          opportunity
        );

      }

    }
  );


  return formatted.map(
    (recommendation, index) => {

      const recommendationId =
        recommendation?.id;


      const rankedOpportunity =
        recommendationId !== undefined &&
        recommendationId !== null
          ? rankedById.get(
              String(
                recommendationId
              )
            )
          : ranked[index];


      return preserveOpportunityMetadata(
        recommendation,
        rankedOpportunity || {}
      );

    }
  );

}


/* ============================================================
   BUDGET ALTERNATIVES
============================================================ */

function buildBudgetAlternatives(
  recommendations = [],
  budget = null
) {

  if (
    !Number.isFinite(
      Number(budget)
    ) ||
    !Array.isArray(
      recommendations
    )
  ) {

    return [];

  }


  const numericBudget =
    Number(budget);


  return recommendations

    .filter(
      opportunity => {

        const price =
          getPrice(
            opportunity
          );


        return (
          typeof price === "number" &&
          price > numericBudget
        );

      }
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
      opportunity => {

        const price =
          getPrice(
            opportunity
          );


        return {

          id:
            opportunity.id ||
            null,

          title:
            opportunity.title ||
            "Property",

          price,

          budgetGap:
            price -
            numericBudget,

          location:
            opportunity?.location?.city ||
            null

        };

      }
    );

}


/* ============================================================
   BUDGET ANALYSIS
============================================================ */

function buildBudgetAnalysis(
  recommendations = [],
  context = {}
) {

  const rawBudget =
    context?.budget;


  const budget =
    Number.isFinite(
      Number(rawBudget)
    ) &&
    Number(rawBudget) > 0
      ? Number(rawBudget)
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


  const normalized =
    normalizeArray(
      recommendations
    );


  const priced =
    normalized.filter(
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
      normalized,
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


/* ============================================================
   BUILD SUMMARY
============================================================ */

function buildSummary(
  recommendations = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      recommendations
    );


  const budgetAnalysis =
    buildBudgetAnalysis(
      normalized,
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
    normalized.length === 0
  ) {

    return (
      "No suitable opportunities were found for the current request."
    );

  }


  return null;

}


/* ============================================================
   BUILD NEXT ACTION
============================================================ */

function buildNextAction(
  recommendations = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      recommendations
    );


  const budgetAnalysis =
    buildBudgetAnalysis(
      normalized,
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
    normalized.length > 0
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


/* ============================================================
   BUILD RECOMMENDATIONS
============================================================ */

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


/* ============================================================
   GENERATE LIFESTYLE RECOMMENDATIONS
============================================================ */

async function generateLifestyleRecommendations(
  input = {}
) {

  /* ==========================================================
     CONTEXT
  ========================================================== */

  const context =
    input?.context &&
    typeof input.context === "object"
      ? input.context
      : input;


  console.log(
    "[Lifestyle Recommendation] Starting workflow."
  );


  /* ==========================================================
     1. DISCOVERY
  ========================================================== */

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
          [],

        count:
          0

      },

      scoring: {

        success:
          false,

        opportunities:
          [],

        count:
          0

      },

      ranking: {

        success:
          false,

        opportunities:
          [],

        count:
          0

      },

      formatting: {

        success:
          false,

        recommendations:
          [],

        count:
          0

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


  discovery = {

    ...discovery,

    success:
      discovery?.success === true,

    opportunities:
      discoveredOpportunities,

    count:
      discoveredOpportunities.length

  };


  console.log(
    "[Lifestyle Recommendation] Discovery complete:",
    discoveredOpportunities.length
  );


  /* ==========================================================
     2. REASONING
  ========================================================== */

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


  /* ==========================================================
     3. SCORING
  ========================================================== */

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
      scoredRecommendations.length,

    status:
      "completed"

  };


  console.log(
    "[Lifestyle Recommendation] Scoring complete:",
    scoring.count
  );


  /* ==========================================================
     4. RANKING
  ========================================================== */

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
      rankedRecommendations.length,

    status:
      "completed"

  };


  console.log(
    "[Lifestyle Recommendation] Ranking complete:",
    ranking.count
  );


  /* ==========================================================
     5. FORMATTING
  ========================================================== */

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


  /* ==========================================================
     6. RESTORE STRUCTURED INTELLIGENCE
  ========================================================== */

  const recommendations =
    mergeFormattedRecommendations(
      formattedRecommendations,
      rankedRecommendations
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


  /* ==========================================================
     7. PRIMARY
  ========================================================== */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /* ==========================================================
     8. BUDGET ANALYSIS
  ========================================================== */

  const budgetAnalysis =
    buildBudgetAnalysis(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     9. SUMMARY
  ========================================================== */

  const summary =
    buildSummary(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     10. NEXT ACTION
  ========================================================== */

  const nextAction =
    buildNextAction(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     11. FINAL RESULT
  ========================================================== */

  const result = {

    success:
      true,


    discovery,

    reasoning,

    scoring,

    ranking,

    formatting,


    recommendations,

    count:
      recommendations.length,

    primary,


    budgetAnalysis,

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


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
