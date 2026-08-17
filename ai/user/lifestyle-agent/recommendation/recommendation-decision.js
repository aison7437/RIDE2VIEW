/**
 * Ride2View Recommendation Decision Module
 *
 * Purpose:
 * Converts ranked recommendations into explicit
 * decision roles.
 *
 * Decision hierarchy:
 *
 * 1. Primary recommendation
 * 2. Alternative recommendations
 * 3. Low-priority recommendations
 *
 * This module does not execute bookings,
 * payments, purchases, or other consequential actions.
 */


/**
 * Apply decision roles to ranked recommendations.
 *
 * Assumption:
 * recommendations are already ranked by the
 * Opportunity Scoring Model.
 */
function applyRecommendationDecision(
  recommendations = []
) {

  if (!Array.isArray(recommendations)) {
    return [];
  }


  return recommendations.map(
    (recommendation, index) => {

      const score =
        Number(
          recommendation.score
        ) || 0;


      const matchPercentage =
        Number(
          recommendation.matchPercentage
        ) || 0;


      // -----------------------------------------
      // PRIMARY
      // -----------------------------------------

      if (index === 0) {

        return {

          ...recommendation,

          decision:
            "primary",

          priority:
            "high",

          primary:
            true,

          decisionReason:
            "Highest-ranked opportunity based on the scoring and ranking hierarchy.",

          recommendedAction:
            "Present as the primary recommendation."

        };

      }


      // -----------------------------------------
      // ALTERNATIVE
      // -----------------------------------------

      if (
        score >= 80 &&
        matchPercentage >= 60
      ) {

        return {

          ...recommendation,

          decision:
            "alternative",

          priority:
            "medium",

          primary:
            false,

          decisionReason:
            "Strong enough match to serve as an alternative to the primary recommendation.",

          recommendedAction:
            "Present as an alternative option."

        };

      }


      // -----------------------------------------
      // LOW PRIORITY
      // -----------------------------------------

      return {

        ...recommendation,

        decision:
          "low-priority",

        priority:
          "low",

        primary:
          false,

        decisionReason:
          "Lower-ranked opportunity with weaker overall suitability.",

        recommendedAction:
          "Keep available as a lower-priority option."

      };

    }
  );

}


/**
 * Select the primary recommendation.
 */
function selectPrimaryRecommendation(
  recommendations = []
) {

  if (!Array.isArray(recommendations)) {
    return null;
  }


  return (
    recommendations.find(
      recommendation =>
        recommendation.primary === true
    ) || null
  );

}


/**
 * Build a summary of recommendation decisions.
 */
function buildDecisionSummary(
  recommendations = []
) {

  if (!Array.isArray(recommendations)) {

    return {

      total:
        0,

      primaryCount:
        0,

      recommendedCount:
        0,

      alternativeCount:
        0,

      lowPriorityCount:
        0

    };

  }


  return {

    total:
      recommendations.length,

    primaryCount:
      recommendations.filter(
        item =>
          item.decision === "primary"
      ).length,

    recommendedCount:
      recommendations.filter(
        item =>
          item.decision === "primary"
      ).length,

    alternativeCount:
      recommendations.filter(
        item =>
          item.decision === "alternative"
      ).length,

    lowPriorityCount:
      recommendations.filter(
        item =>
          item.decision === "low-priority"
      ).length

  };

}


module.exports = {

  applyRecommendationDecision,

  selectPrimaryRecommendation,

  buildDecisionSummary

};
