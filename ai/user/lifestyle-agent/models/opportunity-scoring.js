/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Ranking priority:
 *
 * 1. Overall score
 * 2. Match percentage
 * 3. Budget efficiency
 * 4. Opportunity ID
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
  // 5. Preference match
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


  score +=
    reasoningScore * 0.25;


  // -----------------------------------------
  // 7. Match percentage
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
  // 8. Budget
  // -----------------------------------------

  const budget =
    Number(
      opportunity.budget ??
      context.budget
    );


  // -----------------------------------------
  // 9. Budget efficiency
  //
  // Higher percentage = more of the
  // available budget consumed.
  //
  // For tie-breaking, LOWER consumption
  // is preferred.
  // -----------------------------------------

  let budgetEfficiency = null;


  const price =
    Number(
      opportunity.price
    );


  if (
    Number.isFinite(price) &&
    Number.isFinite(budget) &&
    budget > 0
  ) {

    budgetEfficiency =
      Number(
        (
          (price / budget) * 100
        ).toFixed(2)
      );

  }


  // -----------------------------------------
  // 10. Return scored opportunity
  // -----------------------------------------

  return {

    ...opportunity,

    score,

    matchPercentage,

    budget:
      Number.isFinite(budget)
        ? budget
        : null,

    budgetEfficiency,

    reasoningScore,

    context

  };

}


/**
 * Compare two scored opportunities.
 *
 * Ranking priority:
 *
 * 1. Overall score — higher wins
 * 2. Match percentage — higher wins
 * 3. Budget efficiency — lower wins
 * 4. Opportunity ID — deterministic alphabetical order
 */
function compareOpportunities(
  a = {},
  b = {}
) {

  // -----------------------------------------
  // Primary: overall score
  // -----------------------------------------

  const scoreDifference =
    (
      Number(b.score) || 0
    ) -
    (
      Number(a.score) || 0
    );


  if (
    scoreDifference !== 0
  ) {

    return scoreDifference;

  }


  // -----------------------------------------
  // Secondary: match percentage
  // -----------------------------------------

  const matchDifference =
    (
      Number(b.matchPercentage) || 0
    ) -
    (
      Number(a.matchPercentage) || 0
    );


  if (
    matchDifference !== 0
  ) {

    return matchDifference;

  }


  // -----------------------------------------
  // Tertiary: budget efficiency
  //
  // Lower budget consumption wins.
  // -----------------------------------------

  const aBudget =
    Number(a.budgetEfficiency);

  const bBudget =
    Number(b.budgetEfficiency);


  const aHasBudget =
    Number.isFinite(aBudget);

  const bHasBudget =
    Number.isFinite(bBudget);


  if (
    aHasBudget &&
    bHasBudget &&
    aBudget !== bBudget
  ) {

    return aBudget - bBudget;

  }


  /*
   * If only one opportunity has a usable
   * budget-efficiency value, prefer it.
   */

  if (
    aHasBudget &&
    !bHasBudget
  ) {

    return -1;

  }


  if (
    !aHasBudget &&
    bHasBudget
  ) {

    return 1;

  }


  // -----------------------------------------
  // Final: deterministic opportunity ID
  // -----------------------------------------

  const aId =
    String(
      a.id ?? ""
    );

  const bId =
    String(
      b.id ?? ""
    );


  return aId.localeCompare(
    bId
  );

}


/**
 * Rank opportunities.
 */
function rankOpportunities(
  opportunities = [],
  context = {}
) {

  if (
    !Array.isArray(
      opportunities
    )
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
      compareOpportunities
    );

}


module.exports = {

  scoreOpportunity,

  compareOpportunities,

  rankOpportunities

};
