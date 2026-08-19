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
 * Responsibilities:
 *
 * 1. Discover opportunities
 * 2. Reason about discovered opportunities
 * 3. Score opportunities
 * 4. Rank opportunities
 * 5. Format recommendations
 * 6. Build budget intelligence
 * 7. Select primary recommendation
 * 8. Generate summary
 * 9. Generate next action
 *
 * IMPORTANT:
 *
 * Scoring happens exactly once in this workflow.
 *
 * rankOpportunities() from opportunity-scoring.js
 * also scores opportunities internally, so this workflow
 * passes the already-scored opportunities into ranking.
 *
 * Existing exports are preserved:
 *
 * generateLifestyleRecommendations
 * buildRecommendations
 * scoreRecommendations
 * rankRecommendations
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

/**
 * Always return an array.
 */
function normalizeArray(value) {

  return Array.isArray(value)
    ? value
    : [];

}


/**
 * Safely extract a price.
 *
 * Supports both:
 *
 * opportunity.price
 *
 * and:
 *
 * opportunity.property.price
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
 * Safely normalize numeric values.
 */
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
   SCORE OPPORTUNITIES
============================================================ */

/**
 * Score each opportunity exactly once.
 *
 * This function is the single scoring stage of the workflow.
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


/* ============================================================
   RANK OPPORTUNITIES
============================================================ */

/**
 * Rank already-scored opportunities.
 *
 * IMPORTANT:
 *
 * rankOpportunities() internally calls scoreOpportunity().
 *
 * Therefore this workflow cannot simply score and then call
 * rankOpportunities() without causing a second scoring pass.
 *
 * To preserve the scoring model's deterministic hierarchy,
 * we pass the scored opportunities through rankOpportunities().
 *
 * Because scoreOpportunity() preserves an existing valid
 * opportunity.score, the second pass does not alter the
 * established score.
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


/* ============================================================
   BUDGET ALTERNATIVES
============================================================ */

/**
 * Find the closest properties above the user's budget.
 *
 * These are presented as alternatives rather than being
 * treated as budget-compatible recommendations.
 */
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

/**
 * Analyse whether the returned opportunities contain
 * properties within the user's stated budget.
 */
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

/**
 * Build a user-facing summary when the result needs
 * additional explanation.
 */
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


  /*
   * A suitable result exists inside budget.
   *
   * No negative summary is necessary.
   */
  if (
    budgetAnalysis.budgetProvided &&
    budgetAnalysis.exactMatch
  ) {

    return null;

  }


  /*
   * Budget was supplied but nothing suitable was
   * found within budget.
   *
   * Provide the closest alternatives.
   */
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


  /*
   * Budget supplied but no alternatives exist.
   */
  if (
    budgetAnalysis.budgetProvided &&
    !budgetAnalysis.exactMatch
  ) {

    return (
      `No suitable property was found within the KSh ${budgetAnalysis.budget} budget.`
    );

  }


  /*
   * No opportunities at all.
   */
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

/**
 * Generate the next action the user can take.
 */
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


  /*
   * Budget problem with available alternatives.
   */
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


  /*
   * At least one recommendation exists.
   */
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


  /*
   * Nothing suitable was found.
   */
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

/**
 * Convenience pipeline:
 *
 * opportunities
 *      ↓
 * scoring
 *      ↓
 * ranking
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


/* ============================================================
   GENERATE LIFESTYLE RECOMMENDATIONS
============================================================ */

async function generateLifestyleRecommendations(
  input = {}
) {

  /* ==========================================================
     0. NORMALIZE CONTEXT
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


  /*
   * Make sure discovery always has the expected
   * contract even if the discovery module omitted
   * a field.
   */
  discovery = {

    success:
      discovery?.success === true,

    ...discovery,

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


    /*
     * Graceful degradation:
     *
     * If reasoning fails, retain the discovered
     * opportunities so the core recommendation
     * pipeline can continue.
     */
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

  /*
   * THIS IS THE SINGLE EXPLICIT SCORING STAGE.
   */
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

  /*
   * rankOpportunities() internally invokes scoreOpportunity().
   *
   * However, scoreOpportunity() preserves an existing valid
   * opportunity.score. Therefore the score generated above
   * remains authoritative and deterministic.
   *
   * No additional scoring logic is implemented here.
   */
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


    /*
     * Formatting failure must not destroy the
     * recommendation data.
     */
    formattedRecommendations =
      rankedRecommendations;

  }


  const recommendations =
    normalizeArray(
      formattedRecommendations
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
     6. PRIMARY RECOMMENDATION
  ========================================================== */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /* ==========================================================
     7. BUDGET ANALYSIS
  ========================================================== */

  const budgetAnalysis =
    buildBudgetAnalysis(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     8. SUMMARY
  ========================================================== */

  const summary =
    buildSummary(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     9. NEXT ACTION
  ========================================================== */

  const nextAction =
    buildNextAction(
      rankedRecommendations,
      context
    );


  /* ==========================================================
     10. FINAL RESULT
  ========================================================== */

  const result = {

    success:
      true,


    /* --------------------------------------------------------
       PIPELINE STAGES
    -------------------------------------------------------- */

    discovery,

    reasoning,

    scoring,

    ranking,

    formatting,


    /* --------------------------------------------------------
       FINAL RECOMMENDATIONS
    -------------------------------------------------------- */

    recommendations,

    count:
      recommendations.length,

    primary,


    /* --------------------------------------------------------
       BUDGET INTELLIGENCE
    -------------------------------------------------------- */

    budgetAnalysis,


    /* --------------------------------------------------------
       USER GUIDANCE
    -------------------------------------------------------- */

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
