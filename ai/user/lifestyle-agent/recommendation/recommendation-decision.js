/**
 * Ride2View Recommendation Decision Module
 *
 * Decision hierarchy:
 *
 * 1. Overall score        DESC
 * 2. Match percentage     DESC
 * 3. Budget efficiency    ASC
 * 4. Opportunity ID       ASC
 *
 * Lower budget efficiency is better because it represents
 * the percentage of budget consumed.
 */

/**
 * Safely convert a value to a number.
 */
function numericValue(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/**
 * Compare two recommendations using the official
 * Ride2View deterministic ranking hierarchy.
 */
function compareRecommendations(a, b) {
  // PRIMARY: overall score
  const scoreA = numericValue(a.score);
  const scoreB = numericValue(b.score);

  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  // SECONDARY: match percentage
  const matchA = numericValue(a.matchPercentage);
  const matchB = numericValue(b.matchPercentage);

  if (matchA !== matchB) {
    return matchB - matchA;
  }

  // TERTIARY: budget efficiency
  // Lower percentage of budget consumed = better.
  const efficiencyA = numericValue(a.budgetEfficiency);
  const efficiencyB = numericValue(b.budgetEfficiency);

  if (efficiencyA !== efficiencyB) {
    return efficiencyA - efficiencyB;
  }

  // FINAL: opportunity ID
  const idA = String(a.id || "");
  const idB = String(b.id || "");

  return idA.localeCompare(idB);
}

/**
 * Sort recommendations according to the
 * Ride2View decision hierarchy.
 */
function rankRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return [...recommendations].sort(compareRecommendations);
}

/**
 * Apply recommendation decisions after ranking.
 *
 * The first recommendation is the primary recommendation.
 * Everything else becomes an alternative.
 */
function applyRecommendationDecision(recommendations) {
  const ranked = rankRecommendations(recommendations);

  return ranked.map((recommendation, index) => ({
    ...recommendation,

    decision: index === 0 ? "primary" : "alternative",

    priority: index === 0 ? "high" : "low",

    primary: index === 0,

    rank: index + 1
  }));
}

/**
 * Select the primary recommendation.
 */
function selectPrimaryRecommendation(recommendations) {
  if (!Array.isArray(recommendations)) {
    return null;
  }

  return recommendations.find(
    recommendation => recommendation.primary === true
  ) || null;
}

/**
 * Build a summary of recommendation decisions.
 */
function buildDecisionSummary(recommendations) {
  if (!Array.isArray(recommendations)) {
    return {
      total: 0,
      primaryCount: 0,
      recommendedCount: 0,
      alternativeCount: 0,
      lowPriorityCount: 0
    };
  }

  return {
    total: recommendations.length,

    primaryCount:
      recommendations.filter(
        item => item.decision === "primary"
      ).length,

    recommendedCount:
      recommendations.filter(
        item => item.decision === "recommended"
      ).length,

    alternativeCount:
      recommendations.filter(
        item => item.decision === "alternative"
      ).length,

    lowPriorityCount:
      recommendations.filter(
        item => item.decision === "low-priority"
      ).length
  };
}

module.exports = {
  numericValue,
  compareRecommendations,
  rankRecommendations,
  applyRecommendationDecision,
  selectPrimaryRecommendation,
  buildDecisionSummary
};
