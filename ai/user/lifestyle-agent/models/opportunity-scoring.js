/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Purpose:
 * Provides a basic scoring mechanism for ranking
 * opportunities discovered by the Lifestyle Agent.
 *
 * This is a foundation model.
 * It can later be replaced or enhanced by a more
 * sophisticated ML/AI ranking system.
 */

function scoreOpportunity(opportunity = {}, context = {}) {
  let score = 0;

  // Relevance to the user's current goal
  if (opportunity.relevance === "high") {
    score += 40;
  } else if (opportunity.relevance === "medium") {
    score += 25;
  } else {
    score += 10;
  }

  // Location relevance
  if (opportunity.locationMatch === true) {
    score += 20;
  }

  // Budget compatibility
  if (opportunity.budgetCompatible === true) {
    score += 15;
  }

  // Time compatibility
  if (opportunity.timeCompatible === true) {
    score += 15;
  }

  // User preference match
  if (opportunity.preferenceMatch === true) {
    score += 10;
  }

  return {
    score,
    opportunity,
    context
  };
}

function rankOpportunities(opportunities = [], context = {}) {
  return opportunities
    .map((opportunity) =>
      scoreOpportunity(opportunity, context)
    )
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreOpportunity,
  rankOpportunities
};
