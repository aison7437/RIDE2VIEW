/**
 * Ride2View Lifestyle Agent
 * Recommendation Decision Engine
 *
 * Purpose:
 * Converts ranked/ formatted recommendations into
 * actionable decisions.
 *
 * Responsibilities:
 * - Identify the primary recommendation
 * - Classify alternatives
 * - Detect budget conflicts
 * - Detect strong matches
 * - Recommend the next user action
 * - Avoid recalculating the ranking score
 */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Determine the decision classification.
 */
function determineDecision(recommendation) {

  const matchPercentage =
    safeNumber(
      recommendation.matchPercentage
    );

  const tier =
    recommendation.recommendationTier ||
    "low-match";

  const budgetCompatible =
    recommendation.budgetCompatible === true;

  const locationMatch =
    recommendation.locationMatch === true;

  const preferenceMatch =
    recommendation.preferenceMatch === true;


  // -----------------------------------------
  // Strong recommendation
  // -----------------------------------------

  if (
    tier === "strong-match" &&
    budgetCompatible
  ) {

    return "primary";

  }


  // -----------------------------------------
  // Good recommendation
  // -----------------------------------------

  if (
    tier === "good-match" &&
    (
      budgetCompatible ||
      preferenceMatch
    )
  ) {

    return "recommended";

  }


  // -----------------------------------------
  // Alternative
  // -----------------------------------------

  if (
    locationMatch &&
    preferenceMatch &&
    !budgetCompatible
  ) {

    return "alternative";

  }


  // -----------------------------------------
  // General fallback
  // -----------------------------------------

  if (matchPercentage >= 50) {

    return "alternative";

  }


  return "low-priority";
}


/**
 * Determine priority level.
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
 * Determine whether this recommendation
 * should be shown as the primary option.
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
 * Generate a human-readable decision reason.
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


  // -----------------------------------------
  // Primary
  // -----------------------------------------

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
      "Strongest available match for the user's "
      + "current context."
    );

  }


  // -----------------------------------------
  // Recommended
  // -----------------------------------------

  if (decision === "recommended") {

    return (
      "Good match for the user's current goal "
      + "and context."
    );

  }


  // -----------------------------------------
  // Budget conflict
  // -----------------------------------------

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
      "Matches important user preferences but "
      + "does not satisfy the budget constraint."
    );

  }


  // -----------------------------------------
  // General alternative
  // -----------------------------------------

  if (decision === "alternative") {

    return (
      "Potential alternative, but not the strongest "
      + "available recommendation."
    );

  }


  // -----------------------------------------
  // Low priority
  // -----------------------------------------

  return (
    "Low-priority opportunity based on the "
    + "current user context."
  );
}


/**
 * Determine the next action for the user.
 */
function determineAction(
  recommendation,
  decision
) {

  const type =
    recommendation.type ||
    null;

  const existingAction =
    recommendation.recommendedAction ||
    null;


  // -----------------------------------------
  // Property
  // -----------------------------------------

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


  // -----------------------------------------
  // Mobility
  // -----------------------------------------

  if (type === "mobility") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {

      return "book-ride";

    }

    return "review-ride";
  }


  // -----------------------------------------
  // Food
  // -----------------------------------------

  if (type === "food") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {

      return "order-food";

    }

    return "review-food";
  }


  // -----------------------------------------
  // Commerce
  // -----------------------------------------

  if (type === "commerce") {

    if (
      decision === "primary" ||
      decision === "recommended"
    ) {

      return "shop";

    }

    return "review-marketplace";
  }


  // -----------------------------------------
  // Fallback
  // -----------------------------------------

  return (
    existingAction ||
    "view-opportunity"
  );
}


/**
 * Apply decision intelligence to
 * formatted recommendations.
 */
function applyRecommendationDecision(
  recommendations
) {

  if (
    !Array.isArray(recommendations)
  ) {

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

        // -------------------------------------
        // Decision
        // -------------------------------------

        decision:
          decision,

        priority:
          priority,

        primary:
          primary,

        decisionReason:
          decisionReason,

        recommendedAction:
          recommendedAction

      };

    }
  );
}


/**
 * Select the primary recommendation.
 */
function selectPrimaryRecommendation(
  recommendations
) {

  if (
    !Array.isArray(recommendations)
  ) {

    return null;

  }

  return (
    recommendations.find(
      function (item) {

        return item.primary === true;

      }
    ) ||
    null
  );
}


/**
 * Generate a decision summary.
 */
function buildDecisionSummary(
  recommendations
) {

  if (
    !Array.isArray(recommendations)
  ) {

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
