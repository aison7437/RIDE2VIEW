/**
 * Ride2View Lifestyle Agent
 * Recommendation Decision Engine
 *
 * Converts ranked recommendations into
 * actionable decisions.
 */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Determine decision classification.
 */
function determineDecision(recommendation) {

  const matchPercentage =
    safeNumber(recommendation.matchPercentage);

  const tier =
    recommendation.recommendationTier ||
    "low-match";

  const budgetCompatible =
    recommendation.budgetCompatible === true;

  const locationMatch =
    recommendation.locationMatch === true;

  const preferenceMatch =
    recommendation.preferenceMatch === true;


  if (
    tier === "strong-match" &&
    budgetCompatible
  ) {
    return "primary";
  }


  if (
    tier === "good-match" &&
    (
      budgetCompatible ||
      preferenceMatch
    )
  ) {
    return "recommended";
  }


  if (
    locationMatch &&
    preferenceMatch &&
    !budgetCompatible
  ) {
    return "alternative";
  }


  if (matchPercentage >= 50) {
    return "alternative";
  }


  return "low-priority";
}


/**
 * Determine priority.
 */
function determinePriority(
  decision,
  recommendation
) {

  const matchPercentage =
    safeNumber(
      recommendation.matchPercentage
    );

  if (decision === "primary") {
    return "high";
  }

  if (
    decision === "recommended" ||
    matchPercentage >= 65
  ) {
    return "medium";
  }

  if (decision === "alternative") {
    return "low";
  }

  return "very-low";
}


/**
 * Determine primary recommendation.
 */
function determinePrimary(
  decision,
  recommendation
) {

  return (
    decision === "primary" &&
    recommendation.rank === 1
  );
}


/**
 * Build human-readable decision reason.
 */
function buildDecisionReason(
  recommendation,
  decision
) {

  const budget =
    safeNumber(
      recommendation.budget
    );

  const price =
    recommendation.price !== null &&
    recommendation.price !== undefined
      ? safeNumber(recommendation.price)
      : null;

  const locationMatch =
    recommendation.locationMatch === true;

  const budgetCompatible =
    recommendation.budgetCompatible === true;

  const preferenceMatch =
    recommendation.preferenceMatch === true;


  if (decision === "primary") {

    if (
      price !== null &&
      budget > 0
    ) {

      const remaining =
        budget - price;

      return (
        "Strongest match based on relevance, " +
        "location and budget. " +
        `Leaves approximately KSh ${remaining.toLocaleString(
          "en-KE"
        )} within budget.`
      );
    }

    return (
      "Strongest available match for the user's " +
      "current context."
    );
  }


  if (decision === "recommended") {

    return (
      "Good match for the user's current goal " +
      "and context."
    );
  }


  if (
    decision === "alternative" &&
    locationMatch &&
    preferenceMatch &&
    !budgetCompatible
  ) {

    if (
      price !== null &&
      budget > 0
    ) {

      const difference =
        price - budget;

      return (
        "Matches the user's location and preference " +
        `but exceeds the budget by approximately KSh ${difference.toLocaleString(
          "en-KE"
        )}.`
      );
    }

    return (
      "Matches important user preferences but " +
      "does not satisfy the budget constraint."
    );
  }


  if (decision === "alternative") {

    return (
      "Potential alternative, but not the strongest " +
      "available recommendation."
    );
  }


  return (
    "Low-priority opportunity based on the " +
    "current user context."
  );
}


/**
 * Determine next user action.
 */
function determineAction(
  recommendation,
  decision
) {

  const type =
    recommendation.type || null;

  const existingAction =
    recommendation.recommendedAction || null;


  if (type === "property") {

    if (decision === "primary") {
      return "view-property";
    }

    if (decision === "recommended") {
      return "compare-property";
    }

    if (decision === "alternative") {
      return "review-property";
    }

    return "dismiss-property";
  }


  if (type === "mobility") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {
      return "book-ride";
    }

    return "review-ride";
  }


  if (type === "food") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {
      return "order-food";
    }

    return "review-food";
  }


  if (type === "commerce") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {
      return "shop";
    }

    return "review-marketplace";
  }


  return (
    existingAction ||
    "view-opportunity"
  );
}


/**
 * Apply decision intelligence.
 */
function applyRecommendationDecision(
  recommendations
) {

  if (!Array.isArray(recommendations)) {
    return [];
  }


  return recommendations.map(
    function (recommendation) {

      const decision =
        determineDecision(
          recommendation
        );

      const priority =
        determinePriority(
          decision,
          recommendation
        );

      const primary =
        determinePrimary(
          decision,
          recommendation
        );

      const decisionReason =
        buildDecisionReason(
          recommendation,
          decision
        );

      const recommendedAction =
        determineAction(
          recommendation,
          decision
        );


      return {

        ...recommendation,

        decision,

        priority,

        primary,

        decisionReason,

        recommendedAction
      };
    }
  );
}


/**
 * Select primary recommendation.
 */
function selectPrimaryRecommendation(
  recommendations
) {

  if (!Array.isArray(recommendations)) {
    return null;
  }

  return (
    recommendations.find(
      function (item) {
        return item.primary === true;
      }
    ) || null
  );
}


/**
 * Generate decision summary.
 */
function buildDecisionSummary(
  recommendations
) {

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

    total:
      recommendations.length,

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

  buildDecisionSummary,

  determineDecision,

  determinePriority,

  determinePrimary,

  buildDecisionReason,

  determineAction
};
