/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Purpose:
 * Scores and ranks opportunities using:
 * relevance,
 * location,
 * budget,
 * time,
 * preferences,
 * and reasoning signals.
 */

function scoreOpportunity(
  opportunity = {},
  context = {}
) {

  let score = 0;


  // -----------------------------------------
  // 1. Relevance
  // -----------------------------------------

  if (opportunity.relevance === "high") {

    score += 40;

  } else if (opportunity.relevance === "medium") {

    score += 25;

  } else {

    score += 10;

  }


  // -----------------------------------------
  // 2. Location
  // -----------------------------------------

  if (
    opportunity.locationMatch === true
  ) {

    score += 20;

  }


  // -----------------------------------------
  // 3. Budget
  // -----------------------------------------

  if (
    opportunity.budgetCompatible === true
  ) {

    score += 15;

  }


  // -----------------------------------------
  // 4. Time
  // -----------------------------------------

  if (
    opportunity.timeCompatible === true
  ) {

    score += 15;

  }


  // -----------------------------------------
  // 5. Preference
  // -----------------------------------------

  if (
    opportunity.preferenceMatch === true
  ) {

    score += 10;

  }


  // -----------------------------------------
  // 6. Reasoning contribution
  // -----------------------------------------

  const reasoningScore =
    Number(
      opportunity.reasoningScore
    ) || 0;


  // Add a controlled reasoning contribution.
  score += reasoningScore * 0.25;


  // -----------------------------------------
  // 7. Normalize match percentage
  // -----------------------------------------

  const matchPercentage =
    Math.min(
      100,
      Number(
        (
          (score / 125) * 100
        ).toFixed(1)
      )
    );


  // -----------------------------------------
  // 8. Return scored opportunity
  // -----------------------------------------

  return {

    ...opportunity,

    score,

    matchPercentage,

    budget:
      opportunity.budget ??
      context.budget ??
      null,

    reasoningScore,

    context
  };
}


function rankOpportunities(
  opportunities = [],
  context = {}
) {

  if (
    !Array.isArray(opportunities)
  ) {

    return [];

  }


  return opportunities

    .map(
      (opportunity) =>
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
