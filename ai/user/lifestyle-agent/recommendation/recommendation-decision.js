/**
 * Ride2View Recommendation Decision Module
 */

function applyRecommendationDecision(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.map((recommendation, index) => ({
    ...recommendation,
    decision: index === 0 ? "primary" : "alternative",
    priority: index === 0 ? "high" : "low",
    primary: index === 0
  }));
}

function selectPrimaryRecommendation(recommendations) {
  if (!Array.isArray(recommendations)) {
    return null;
  }

  return recommendations.find(
    recommendation => recommendation.primary === true
  ) || null;
}

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
  applyRecommendationDecision,
  selectPrimaryRecommendation,
  buildDecisionSummary
};
