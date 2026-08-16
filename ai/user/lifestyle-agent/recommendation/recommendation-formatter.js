/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Purpose:
 * Converts ranked opportunities into structured,
 * user-facing recommendations.
 *
 * This layer does not make bookings, payments,
 * purchases, or other consequential actions.
 */

function formatRecommendation(
  rankedOpportunity = {},
  context = {}
) {

  const opportunity =
    rankedOpportunity.opportunity || {};

  const score =
    Number(rankedOpportunity.score) || 0;

  const reasoningScore =
    Number(rankedOpportunity.reasoningScore) || 0;

  const reasoningFactors =
    Array.isArray(
      rankedOpportunity.reasoningFactors
    )
      ? rankedOpportunity.reasoningFactors
      : [];


  // -----------------------------------------
  // Determine priority
  // -----------------------------------------

  let priority = "low";

  if (score >= 70) {
    priority = "high";
  } else if (score >= 40) {
    priority = "medium";
  }


  // -----------------------------------------
  // Build explanation signals
  // -----------------------------------------

  const reasons = [];

  if (opportunity.relevance) {
    reasons.push(
      `Goal relevance: ${opportunity.relevance}`
    );
  }

  if (opportunity.locationMatch === true) {
    reasons.push(
      "Location matches the user's context"
    );
  }

  if (opportunity.budgetCompatible === true) {
    reasons.push(
      "Budget appears compatible"
    );
  }

  if (opportunity.timeCompatible === true) {
    reasons.push(
      "Available time appears compatible"
    );
  }

  if (opportunity.preferenceMatch === true) {
    reasons.push(
      "Matches user preferences"
    );
  }

  reasoningFactors.forEach((factor) => {
    if (factor && !reasons.includes(factor)) {
      reasons.push(String(factor));
    }
  });


  // -----------------------------------------
  // Build user-facing recommendation
  // -----------------------------------------

  const service =
    opportunity.service ||
    opportunity.type ||
    "Ride2View service";

  const recommendation = {

    service,

    type:
      opportunity.type || null,

    priority,

    score,

    reasoningScore,

    title:
      `Recommended: ${service}`,

    explanation:
      reasons.length > 0
        ? reasons.join(". ") + "."
        : "This opportunity may be relevant to the user's current context.",

    reasons,

    opportunity,

    context
  };


  return recommendation;
}


/**
 * Format all ranked opportunities.
 */
function formatRecommendations(
  rankedOpportunities = [],
  context = {}
) {

  if (!Array.isArray(rankedOpportunities)) {
    return [];
  }

  return rankedOpportunities.map(
    (opportunity) =>
      formatRecommendation(
        opportunity,
        context
      )
  );
}


module.exports = {
  formatRecommendation,
  formatRecommendations
};
