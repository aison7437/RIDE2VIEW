/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Purpose:
 * Combines deterministic opportunity signals
 * with reasoning signals to produce a final score.
 *
 * Property opportunities receive an additional
 * affordability signal based on the user's budget.
 */


function scoreOpportunity(
  opportunity = {},
  context = {}
) {

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

  if (
    opportunity.locationMatch === true
  ) {

    score += 20;

  }


  // -----------------------------------------
  // 3. Budget compatibility
  // -----------------------------------------

  if (
    opportunity.budgetCompatible === true
  ) {

    score += 15;

  }


  // -----------------------------------------
  // 4. Time compatibility
  // -----------------------------------------

  if (
    opportunity.timeCompatible === true
  ) {

    score += 15;

  }


  // -----------------------------------------
  // 5. User preference
  // -----------------------------------------

  if (
    opportunity.preferenceMatch === true
  ) {

    score += 10;

  }


  // -----------------------------------------
  // 6. Property affordability signal
  // -----------------------------------------
  //
  // This is an additional deterministic signal.
  //
  // It rewards properties that are within the
  // user's stated budget.
  //
  // It does NOT replace the normal budget score.
  //

  let affordabilityScore = 0;

  const userBudget =
    Number(context.budget);

  const propertyPrice =
    Number(opportunity.price);


  if (
    opportunity.type === "property" &&
    Number.isFinite(userBudget) &&
    userBudget > 0 &&
    Number.isFinite(propertyPrice) &&
    propertyPrice > 0
  ) {

    if (
      propertyPrice <= userBudget
    ) {

      const remainingBudget =
        userBudget - propertyPrice;

      const budgetRatio =
        remainingBudget / userBudget;


      // Maximum additional property
      // affordability contribution: 15.
      affordabilityScore =
        Math.min(
          budgetRatio * 15,
          15
        );

    } else {

      // Penalize properties that exceed
      // the user's stated budget.

      affordabilityScore = -15;

    }

    score += affordabilityScore;

  }


  // -----------------------------------------
  // 7. Reasoning signal
  // -----------------------------------------

  const reasoningScore =
    Number(
      opportunity.reasoningScore
    ) || 0;


  const reasoningContribution =
    Math.min(
      reasoningScore,
      100
    ) * 0.25;


  score += reasoningContribution;


  // -----------------------------------------
  // 8. Return structured score
  // -----------------------------------------

  return {

    score,

    baseScore:
      score -
      reasoningContribution,

    reasoningScore,

    reasoningContribution,

    affordabilityScore,

    opportunity,

    context

  };

}


function rankOpportunities(
  opportunities = [],
  context = {}
) {

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
