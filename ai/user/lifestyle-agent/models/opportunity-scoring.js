/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Purpose:
 * Combines deterministic opportunity signals with
 * reasoning signals to produce a final ranking score.
 *
 * This remains a deterministic scoring layer.
 * AI/ML models can enhance the reasoning layer later.
 */

function scoreOpportunity(opportunity = {}, context = {}) {

  let score = 0;


  // -----------------------------------------
  // 1. Goal relevance
  // -----------------------------------------

  if (opportunity.relevance === "high") {
    score += 40;
  } else if (opportunity.relevance === "medium") {
    score += 25;
  } else {
    score += 10;
  }


  // -----------------------------------------
  // 2. Location relevance
  // -----------------------------------------

  if (opportunity.locationMatch === true) {
    score += 20;
  }


  // -----------------------------------------
  // 3. Budget compatibility
  // -----------------------------------------

  if (opportunity.budgetCompatible === true) {
    score += 15;
  }


  // -----------------------------------------
  // 4. Time compatibility
  // -----------------------------------------

  if (opportunity.timeCompatible === true) {
    score += 15;
  }


  // -----------------------------------------
  // 5. User preference
  // -----------------------------------------

  if (opportunity.preferenceMatch === true) {
    score += 10;
  }


  // -----------------------------------------
  // 6. Reasoning signal
  // -----------------------------------------
  //
  // The reasoning engine produces a separate
  // reasoningScore. We incorporate it into the
  // final ranking without allowing it to dominate
  // the deterministic scoring system.
  //

  const reasoningScore =
    Number(opportunity.reasoningScore) || 0;

  const reasoningContribution =
    Math.min(reasoningScore, 100) * 0.25;

  score += reasoningContribution;


  // -----------------------------------------
  // 7. Return structured score
  // -----------------------------------------

  return {

    score,

    baseScore:
      score - reasoningContribution,

    reasoningScore,

    reasoningContribution,

    opportunity,

    context
  };
}


function rankOpportunities(
  opportunities = [],
  context = {}
) {

  return opportunities
    .map((opportunity) =>
      scoreOpportunity(
        opportunity,
        context
      )
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );
}


module.exports = {
  scoreOpportunity,
  rankOpportunities
};
