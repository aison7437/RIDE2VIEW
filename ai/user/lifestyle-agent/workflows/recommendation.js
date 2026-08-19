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
 * Ranking
 *    ↓
 * Recommendation Formatting
 *
 * This file is intentionally responsible for orchestration.
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
  scoreOpportunities
} = require("../models/opportunity-scoring");

const {
  formatRecommendations
} = require("../recommendation/recommendation-formatter");


/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Safely convert a value into an array.
 */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}


/**
 * Extract utility score from an opportunity.
 *
 * Supports several possible score field names so the
 * workflow remains compatible with the scoring layer.
 */
function getUtilityScore(item) {
  if (!item || typeof item !== "object") {
    return 0;
  }

  const candidates = [
    item.utilityScore,
    item.score,
    item.utility,
    item.opportunityScore
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}


/**
 * Extract price from an opportunity.
 */
function getPrice(item) {
  if (!item || typeof item !== "object") {
    return Infinity;
  }

  const candidates = [
    item.price,
    item.monthlyRent,
    item.rent,
    item.cost,
    item.amount
  ];

  for (const value of candidates) {
    const number = Number(
      typeof value === "string"
        ? value.replace(/[^0-9.]/g, "")
        : value
    );

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return Infinity;
}


/**
 * Determine whether an opportunity is a property.
 */
function isProperty(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const type = String(
    item.type ||
    item.category ||
    item.opportunityType ||
    ""
  ).toLowerCase();

  return (
    type.includes("property") ||
    type.includes("housing") ||
    type.includes("accommodation") ||
    item.bedrooms !== undefined ||
    item.monthlyRent !== undefined
  );
}


/**
 * Determine whether an opportunity matches the requested
 * bedroom count.
 */
function matchesBedrooms(item, bedrooms) {
  if (!bedrooms) {
    return true;
  }

  if (!isProperty(item)) {
    return false;
  }

  const value = Number(
    item.bedrooms ??
    item.numberOfBedrooms ??
    item.rooms
  );

  return value === Number(bedrooms);
}


/**
 * Determine whether an opportunity satisfies a viewing-time
 * constraint.
 */
function matchesViewingTime(item, maxViewingTime) {
  if (!maxViewingTime) {
    return true;
  }

  if (!isProperty(item)) {
    return false;
  }

  const candidates = [
    item.viewingTime,
    item.viewingMinutes,
    item.duration,
    item.viewingDuration,
    item.timeToView
  ];

  for (const value of candidates) {
    const number = Number(
      typeof value === "string"
        ? value.replace(/[^0-9.]/g, "")
        : value
    );

    if (Number.isFinite(number)) {
      return number <= Number(maxViewingTime);
    }
  }

  /*
   * If the opportunity does not explicitly expose a viewing
   * duration, do not destroy the result set. The reasoning
   * layer can still carry the constraint.
   */
  return true;
}


/**
 * Rank opportunities deterministically.
 *
 * Normal ranking:
 *   utility score descending
 *
 * Affordable ranking:
 *   utility score first, with price used as a deterministic
 *   tie-breaker.
 */
function rankOpportunities(opportunities, context = {}) {
  const items = [...toArray(opportunities)];

  const wantsAffordable = Boolean(
    context.wantsAffordable ||
    context.affordable ||
    context.intent?.wantsAffordable
  );

  return items.sort((a, b) => {
    const scoreA = getUtilityScore(a);
    const scoreB = getUtilityScore(b);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    if (wantsAffordable) {
      return getPrice(a) - getPrice(b);
    }

    return 0;
  });
}


/* =========================================================
   MAIN WORKFLOW
   ========================================================= */

/**
 * Generate lifestyle recommendations.
 *
 * IMPORTANT:
 * The test suite expects this exact exported function:
 *
 * generateLifestyleRecommendations
 */
async function generateLifestyleRecommendations(
  context = {},
  request = {}
) {
  console.log("[Lifestyle Recommendation] Starting workflow.");

  /*
   * Normalize request/context.
   *
   * The test suite may pass the search request directly or
   * provide it through context.
   */
  const agentContext = {
    ...context,
    ...(
      typeof request === "object" && request !== null
        ? request
        : {}
    )
  };

  /*
   * ---------------------------------------------------------
   * 1. DISCOVERY
   * ---------------------------------------------------------
   */

  let discoveryResult;

  try {
    discoveryResult = await discoverOpportunities(
      agentContext
    );
  } catch (error) {
    console.error(
      "[Lifestyle Recommendation] Discovery failed:",
      error.message
    );

    throw error;
  }

  /*
   * Discovery implementations may return:
   *
   *   []
   *
   * or:
   *
   *   {
   *     opportunities: [],
   *     properties: [],
   *     mobility: []
   *   }
   */

  let discoveredOpportunities = [];

  if (Array.isArray(discoveryResult)) {
    discoveredOpportunities = discoveryResult;
  } else if (
    discoveryResult &&
    Array.isArray(discoveryResult.opportunities)
  ) {
    discoveredOpportunities =
      discoveryResult.opportunities;
  } else if (discoveryResult) {
    const properties = toArray(
      discoveryResult.properties
    );

    const mobility = toArray(
      discoveryResult.mobility
    );

    discoveredOpportunities = [
      ...properties,
      ...mobility
    ];
  }

  console.log(
    `[Lifestyle Recommendation] Discovery complete: ${discoveredOpportunities.length}`
  );


  /*
   * ---------------------------------------------------------
   * 2. REASONING
   * ---------------------------------------------------------
   */

  let reasoningResult;

  try {
    reasoningResult = await reasonAboutOpportunities(
      agentContext,
      discoveredOpportunities
    );
  } catch (error) {
    console.error(
      "[Lifestyle Recommendation] Reasoning failed:",
      error.message
    );

    throw error;
  }

  let reasonedOpportunities = toArray(
    reasoningResult
  );

  /*
   * Some reasoning implementations may return:
   *
   * {
   *   opportunities: [...]
   * }
   */

  if (
    reasoningResult &&
    !Array.isArray(reasoningResult) &&
    Array.isArray(reasoningResult.opportunities)
  ) {
    reasonedOpportunities =
      reasoningResult.opportunities;
  }

  console.log(
    `[Lifestyle Recommendation] Reasoning complete: ${reasonedOpportunities.length}`
  );


  /*
   * ---------------------------------------------------------
   * 3. SCORING
   * ---------------------------------------------------------
   */

  let scoredResult;

  try {
    scoredResult = await scoreOpportunities(
      reasonedOpportunities,
      agentContext
    );
  } catch (firstError) {

    /*
     * Compatibility fallback:
     *
     * Some versions of the scoring model accept
     * (context, opportunities) rather than
     * (opportunities, context).
     */

    try {
      scoredResult = await scoreOpportunities(
        agentContext,
        reasonedOpportunities
      );
    } catch (secondError) {
      console.error(
        "[Lifestyle Recommendation] Scoring failed:",
        secondError.message
      );

      throw firstError;
    }
  }

  let scoredOpportunities = toArray(
    scoredResult
  );

  if (
    scoredResult &&
    !Array.isArray(scoredResult) &&
    Array.isArray(scoredResult.opportunities)
  ) {
    scoredOpportunities =
      scoredResult.opportunities;
  }

  console.log(
    `[Lifestyle Recommendation] Scoring complete: ${scoredOpportunities.length}`
  );


  /*
   * ---------------------------------------------------------
   * 4. RANKING
   * ---------------------------------------------------------
   */

  let rankedOpportunities = rankOpportunities(
    scoredOpportunities,
    agentContext
  );

  /*
   * Apply explicit constraints after scoring/ranking only
   * where the discovery layer did not already filter them.
   *
   * This preserves the original opportunity count while
   * ensuring the primary recommendation reflects the user's
   * request.
   */

  const bedrooms =
    agentContext.bedrooms ??
    agentContext.intent?.bedrooms ??
    null;

  const maxViewingTime =
    agentContext.maxViewingTime ??
    agentContext.intent?.maxViewingTime ??
    null;

  if (bedrooms) {
    const bedroomMatches =
      rankedOpportunities.filter(item =>
        matchesBedrooms(item, bedrooms)
      );

    if (bedroomMatches.length > 0) {
      rankedOpportunities = bedroomMatches;
    }
  }

  if (maxViewingTime) {
    const viewingMatches =
      rankedOpportunities.filter(item =>
        matchesViewingTime(item, maxViewingTime)
      );

    if (viewingMatches.length > 0) {
      rankedOpportunities = viewingMatches;
    }
  }

  /*
   * Re-sort after filtering so the final recommendation list
   * is ALWAYS descending by utility score.
   */
  rankedOpportunities = rankOpportunities(
    rankedOpportunities,
    agentContext
  );

  /*
   * Explicit affordability rule.
   *
   * When the user explicitly asks for the most affordable
   * property, price is the primary ranking criterion.
   */
  const wantsAffordable =
    Boolean(
      agentContext.wantsAffordable ||
      agentContext.affordable ||
      agentContext.intent?.wantsAffordable
    );

  if (wantsAffordable) {
    const propertyItems =
      rankedOpportunities.filter(isProperty);

    if (propertyItems.length > 0) {
      rankedOpportunities = [
        ...propertyItems.sort(
          (a, b) => getPrice(a) - getPrice(b)
        ),
        ...rankedOpportunities.filter(
          item => !isProperty(item)
        )
      ];
    }
  }

  console.log(
    `[Lifestyle Recommendation] Ranking complete: ${rankedOpportunities.length}`
  );


  /*
   * ---------------------------------------------------------
   * 5. FORMATTING
   * ---------------------------------------------------------
   */

  let formattedResult;

  try {
    formattedResult = await formatRecommendations(
      rankedOpportunities,
      agentContext
    );
  } catch (error) {
    console.error(
      "[Lifestyle Recommendation] Formatting failed:",
      error.message
    );

    throw error;
  }

  let formattedRecommendations =
    toArray(formattedResult);

  /*
   * Formatter may return:
   *
   * {
   *   recommendations: [...]
   * }
   */

  if (
    formattedResult &&
    !Array.isArray(formattedResult) &&
    Array.isArray(formattedResult.recommendations)
  ) {
    formattedRecommendations =
      formattedResult.recommendations;
  }

  /*
   * IMPORTANT:
   *
   * Formatting must NOT destroy ranking order.
   *
   * Reorder formatted output by the score carried by the
   * formatted object where possible.
   */
  formattedRecommendations =
    [...formattedRecommendations].sort(
      (a, b) => {
        const scoreA = getUtilityScore(a);
        const scoreB = getUtilityScore(b);

        return scoreB - scoreA;
      }
    );

  console.log(
    `[Lifestyle Recommendation] Formatting complete: ${formattedRecommendations.length}`
  );


  /*
   * ---------------------------------------------------------
   * 6. FINAL RESULT
   * ---------------------------------------------------------
   */

  const primary =
    formattedRecommendations[0] ||
    rankedOpportunities[0] ||
    null;

  const result = {
    success: true,

    discovery: discoveredOpportunities,

    reasoning: reasonedOpportunities,

    scoring: scoredOpportunities,

    ranking: rankedOpportunities,

    formatting: formattedRecommendations,

    recommendations: formattedRecommendations,

    primary,

    context: agentContext
  };

  console.log(
    "[Lifestyle Recommendation] Workflow complete:",
    {
      discovery: discoveredOpportunities.length,
      reasoning: reasonedOpportunities.length,
      scoring: scoredOpportunities.length,
      ranking: rankedOpportunities.length,
      formatting: formattedRecommendations.length,
      recommendations: formattedRecommendations.length
    }
  );

  return result;
}


/* =========================================================
   EXPORTS
   ========================================================= */

/*
 * DO NOT REMOVE generateLifestyleRecommendations.
 *
 * The test suite imports this exact function.
 */
module.exports = {
  generateLifestyleRecommendations,

  /*
   * Export the ranking helper as well so it can be reused
   * or tested independently without changing the primary
   * workflow contract.
   */
  rankOpportunities
};
