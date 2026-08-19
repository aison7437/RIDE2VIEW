/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * User Request
 *      ↓
 * Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Opportunity Scoring
 *      ↓
 * Constraint-aware Ranking
 *      ↓
 * Recommendation Formatting
 *
 * This workflow is intentionally responsible for ORCHESTRATION.
 * Domain scoring remains delegated to opportunity-scoring.js.
 */

/* =========================================================
   IMPORTS
   ========================================================= */

const {
  discoverLifestyleOpportunities
} = require("../tools/opportunity-discovery");

const {
  reasonAboutOpportunities
} = require("../reasoning/reasoning-engine");

const {
  scoreOpportunities,
  rankByUtility
} = require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Safely obtain a numeric value.
 */
function numeric(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Extract a utility score from an opportunity.
 *
 * Different stages may expose the score under slightly
 * different property names. This keeps the workflow
 * tolerant without changing the underlying models.
 */
function getUtilityScore(item) {
  if (!item || typeof item !== "object") {
    return 0;
  }

  return numeric(
    item.utilityScore ??
    item.score ??
    item.utility ??
    item.totalScore ??
    item.scoring?.utilityScore ??
    item.scoring?.score,
    0
  );
}


/**
 * Extract price from an opportunity.
 */
function getPrice(item) {
  if (!item || typeof item !== "object") {
    return Infinity;
  }

  return numeric(
    item.price ??
    item.rent ??
    item.monthlyRent ??
    item.monthlyPrice ??
    item.amount ??
    item.cost ??
    item.pricing?.price ??
    item.pricing?.amount,
    Infinity
  );
}


/**
 * Extract viewing time from an opportunity.
 */
function getViewingTime(item) {
  if (!item || typeof item !== "object") {
    return Infinity;
  }

  return numeric(
    item.viewingTime ??
    item.viewingMinutes ??
    item.duration ??
    item.durationMinutes ??
    item.estimatedViewingTime ??
    item.estimatedViewingMinutes ??
    item.property?.viewingTime ??
    item.property?.viewingMinutes,
    Infinity
  );
}


/**
 * Extract bedrooms from an opportunity.
 */
function getBedrooms(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const value =
    item.bedrooms ??
    item.bedroomCount ??
    item.property?.bedrooms ??
    item.property?.bedroomCount;

  if (value === undefined || value === null) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Determine whether an opportunity is a property.
 */
function isProperty(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const type = String(
    item.type ??
    item.category ??
    item.opportunityType ??
    item.kind ??
    ""
  ).toLowerCase();

  return (
    type.includes("property") ||
    type.includes("housing") ||
    type.includes("accommodation") ||
    item.property !== undefined ||
    item.bedrooms !== undefined ||
    item.bedroomCount !== undefined
  );
}


/**
 * Determine whether an opportunity is mobility/transport.
 */
function isMobility(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const type = String(
    item.type ??
    item.category ??
    item.opportunityType ??
    item.kind ??
    ""
  ).toLowerCase();

  return (
    type.includes("mobility") ||
    type.includes("transport") ||
    type.includes("ride") ||
    type.includes("taxi")
  );
}


/* =========================================================
   CONSTRAINT-AWARE RANKING
   ========================================================= */

/**
 * Apply user constraints to the ranked opportunities.
 *
 * Important:
 * - We do NOT destroy the discovery result.
 * - We preserve alternatives.
 * - We make hard user requirements influence final ordering.
 * - Utility score remains the primary ranking signal.
 */
function applyConstraintAwareRanking(
  opportunities = [],
  context = {}
) {
  if (!Array.isArray(opportunities)) {
    return [];
  }

  const bedrooms = context.bedrooms ?? context.intent?.bedrooms;
  const budget = context.budget ?? context.intent?.budget;
  const maxViewingTime =
    context.maxViewingTime ??
    context.intent?.maxViewingTime;

  const wantsAffordable =
    Boolean(
      context.wantsAffordable ??
      context.intent?.wantsAffordable
    );

  const wantsProperty =
    context.wantsProperty ??
    context.intent?.wantsProperty;

  const ranked = opportunities.map((item, index) => {
    const utilityScore = getUtilityScore(item);
    const price = getPrice(item);
    const viewingTime = getViewingTime(item);
    const itemBedrooms = getBedrooms(item);

    let constraintBonus = 0;
    let constraintPenalty = 0;

    /*
     * -------------------------------------------------------
     * BEDROOM CONSTRAINT
     * -------------------------------------------------------
     */

    if (
      bedrooms !== null &&
      bedrooms !== undefined &&
      isProperty(item)
    ) {
      if (itemBedrooms === Number(bedrooms)) {
        constraintBonus += 1000;
      } else if (itemBedrooms !== null) {
        constraintPenalty += 1000;
      }
    }


    /*
     * -------------------------------------------------------
     * BUDGET CONSTRAINT
     * -------------------------------------------------------
     */

    if (
      budget !== null &&
      budget !== undefined &&
      Number.isFinite(Number(budget)) &&
      isProperty(item)
    ) {
      const requestedBudget = Number(budget);

      if (price !== Infinity) {
        if (price <= requestedBudget) {
          constraintBonus += 500;
        } else {
          constraintPenalty += 500;
        }
      }
    }


    /*
     * -------------------------------------------------------
     * AFFORDABILITY
     * -------------------------------------------------------
     */

    if (
      wantsAffordable &&
      isProperty(item)
    ) {
      /*
       * Lower-priced properties receive a stronger
       * affordability preference.
       *
       * We use a relative preference rather than changing
       * the model's actual utility score.
       */
      if (price !== Infinity) {
        constraintBonus += Math.max(
          0,
          100 - Math.min(price / 1000, 100)
        );
      }
    }


    /*
     * -------------------------------------------------------
     * VIEWING-TIME CONSTRAINT
     * -------------------------------------------------------
     */

    if (
      maxViewingTime !== null &&
      maxViewingTime !== undefined &&
      Number.isFinite(Number(maxViewingTime)) &&
      isProperty(item)
    ) {
      const maximum = Number(maxViewingTime);

      if (viewingTime !== Infinity) {
        if (viewingTime <= maximum) {
          constraintBonus += 400;
        } else {
          constraintPenalty += 400;
        }
      }
    }


    /*
     * -------------------------------------------------------
     * PROPERTY PREFERENCE
     * -------------------------------------------------------
     */

    if (wantsProperty && isProperty(item)) {
      constraintBonus += 25;
    }


    /*
     * Final ranking score.
     *
     * Utility remains the underlying model score.
     * Constraint adjustments are applied only for ordering.
     */
    const rankingScore =
      utilityScore +
      constraintBonus -
      constraintPenalty;

    return {
      item,
      utilityScore,
      rankingScore,
      originalIndex: index
    };
  });


  /*
   * Sort by:
   *
   * 1. Constraint-aware ranking score
   * 2. Raw utility score
   * 3. Original order
   *
   * This prevents unstable ordering when scores tie.
   */
  ranked.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) {
      return b.rankingScore - a.rankingScore;
    }

    if (b.utilityScore !== a.utilityScore) {
      return b.utilityScore - a.utilityScore;
    }

    return a.originalIndex - b.originalIndex;
  });


  /*
   * Restore the expected opportunity shape while
   * preserving useful ranking metadata.
   */
  return ranked.map((entry, index) => {
    return {
      ...entry.item,
      utilityScore:
        entry.item.utilityScore ??
        entry.utilityScore,

      rank: index + 1,

      rankingScore: entry.rankingScore
    };
  });
}


/* =========================================================
   FINAL UTILITY ORDER
   ========================================================= */

/**
 * Ensure the final recommendation list is ordered by
 * descending utility score.
 *
 * This is intentionally done AFTER formatting because
 * formatters may return either objects or nested structures.
 */
function sortRecommendationsByUtility(
  recommendations = []
) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return [...recommendations].sort((a, b) => {
    const scoreA = getUtilityScore(a);
    const scoreB = getUtilityScore(b);

    return scoreB - scoreA;
  });
}


/* =========================================================
   MAIN WORKFLOW
   ========================================================= */

async function generateRecommendations(
  context = {},
  userRequest = null
) {
  console.log(
    "[Lifestyle Recommendation] Starting workflow."
  );


  /*
   * Normalize request.
   */
  const request =
    userRequest ??
    context.userRequest ??
    context.request ??
    context.searchText ??
    context.query ??
    "";


  /*
   * -------------------------------------------------------
   * 1. DISCOVERY
   * -------------------------------------------------------
   */

  const discoveryResult =
    await discoverLifestyleOpportunities(
      request,
      context
    );

  /*
   * Discovery tools may return either:
   *
   * [
   *   opportunity,
   *   opportunity
   * ]
   *
   * or:
   *
   * {
   *   opportunities: [...]
   * }
   */

  let opportunities = Array.isArray(discoveryResult)
    ? discoveryResult
    : (
        discoveryResult?.opportunities ??
        discoveryResult?.results ??
        []
      );

  console.log(
    `[Lifestyle Recommendation] Discovery complete: ${opportunities.length}`
  );


  /*
   * -------------------------------------------------------
   * 2. REASONING
   * -------------------------------------------------------
   */

  const reasoningResult =
    await reasonAboutOpportunities(
      context,
      opportunities
    );

  const reasoning =
    Array.isArray(reasoningResult)
      ? reasoningResult
      : (
          reasoningResult?.opportunities ??
          reasoningResult?.results ??
          reasoningResult ??
          []
        );

  console.log(
    `[Lifestyle Recommendation] Reasoning complete: ${reasoning.length}`
  );


  /*
   * -------------------------------------------------------
   * 3. SCORING
   * -------------------------------------------------------
   */

  let scoredResult =
    await scoreOpportunities(
      reasoning,
      context
    );

  let scoredOpportunities =
    Array.isArray(scoredResult)
      ? scoredResult
      : (
          scoredResult?.opportunities ??
          scoredResult?.results ??
          []
        );

  console.log(
    `[Lifestyle Recommendation] Scoring complete: ${scoredOpportunities.length}`
  );


  /*
   * -------------------------------------------------------
   * 4. BASE RANKING
   * -------------------------------------------------------
   */

  let rankedOpportunities;

  /*
   * Use the existing ranking model when available.
   * If it returns an unexpected shape, fall back to our
   * deterministic ranking.
   */
  try {
    const rankedResult =
      await rankByUtility(
        scoredOpportunities,
        context
      );

    rankedOpportunities =
      Array.isArray(rankedResult)
        ? rankedResult
        : (
            rankedResult?.opportunities ??
            rankedResult?.results ??
            scoredOpportunities
          );
  } catch (error) {
    console.warn(
      "[Lifestyle Recommendation] rankByUtility fallback:",
      error.message
    );

    rankedOpportunities = [...scoredOpportunities];
  }


  /*
   * -------------------------------------------------------
   * 5. CONSTRAINT-AWARE RANKING
   * -------------------------------------------------------
   *
   * This is the important correction.
   *
   * Discovery may know that the user wants:
   *
   * - 3 bedrooms
   * - affordable
   * - <= 60 minute viewing
   * - a particular budget
   *
   * We explicitly propagate those constraints into
   * final ranking.
   */

  rankedOpportunities =
    applyConstraintAwareRanking(
      rankedOpportunities,
      context
    );


  console.log(
    `[Lifestyle Recommendation] Ranking complete: ${rankedOpportunities.length}`
  );


  /*
   * -------------------------------------------------------
   * 6. FORMATTING
   * -------------------------------------------------------
   */

  let formattedResult =
    formatRecommendations(
      rankedOpportunities,
      context
    );

  let formattedRecommendations =
    Array.isArray(formattedResult)
      ? formattedResult
      : (
          formattedResult?.recommendations ??
          formattedResult?.results ??
          []
        );


  console.log(
    `[Lifestyle Recommendation] Formatting complete: ${formattedRecommendations.length}`
  );


  /*
   * -------------------------------------------------------
   * 7. FINAL UTILITY ORDER
   * -------------------------------------------------------
   *
   * Keep the recommendation contract deterministic.
   *
   * The final recommendations must be ordered by
   * descending utility score.
   *
   * IMPORTANT:
   * If the formatter produces objects whose utility score
   * is nested, getUtilityScore() handles that.
   */

  formattedRecommendations =
    sortRecommendationsByUtility(
      formattedRecommendations
    );


  /*
   * Re-apply ranks after final ordering.
   */
  formattedRecommendations =
    formattedRecommendations.map(
      (recommendation, index) => ({
        ...recommendation,
        rank: index + 1
      })
    );


  /*
   * -------------------------------------------------------
   * 8. PRIMARY RECOMMENDATION
   * -------------------------------------------------------
   */

  const primaryRecommendation =
    formattedRecommendations.length > 0
      ? formattedRecommendations[0]
      : null;


  /*
   * -------------------------------------------------------
   * 9. WORKFLOW RESULT
   * -------------------------------------------------------
   */

  const result = {
    success: true,

    request,

    context,

    discovery: opportunities,

    reasoning,

    scoring: scoredOpportunities,

    ranking: rankedOpportunities,

    formatting: formattedRecommendations,

    recommendations: formattedRecommendations,

    primary: primaryRecommendation,

    counts: {
      discovery: opportunities.length,
      reasoning: reasoning.length,
      scoring: scoredOpportunities.length,
      ranking: rankedOpportunities.length,
      formatting: formattedRecommendations.length,
      recommendations: formattedRecommendations.length
    }
  };


  console.log(
    "[Lifestyle Recommendation] Workflow complete:",
    result.counts
  );


  return result;
}


/* =========================================================
   ALIASES
   ========================================================= */

/*
 * Different callers/tests may use different workflow names.
 * Exporting aliases keeps the workflow compatible without
 * duplicating implementation.
 */

const runRecommendationWorkflow =
  generateRecommendations;

const runLifestyleRecommendation =
  generateRecommendations;

const recommendationWorkflow =
  generateRecommendations;


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  generateRecommendations,
  runRecommendationWorkflow,
  runLifestyleRecommendation,
  recommendationWorkflow,

  /*
   * Exporting the helpers also makes this workflow easier
   * to unit-test independently.
   */
  applyConstraintAwareRanking,
  sortRecommendationsByUtility
};
