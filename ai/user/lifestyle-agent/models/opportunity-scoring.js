/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring Model
 *
 * Purpose:
 * Combines deterministic opportunity signals
 * with reasoning signals to produce a final score.
 *
 * Final output:
 * - Raw score
 * - Normalized 0–100% match percentage
 * - Reasoning contribution
 * - Affordability contribution
 *
 * Property opportunities receive an additional
 * affordability signal based on the user's budget.
 */


// -----------------------------------------
// SCORE CONFIGURATION
// -----------------------------------------

const MAX_SCORE = 140;


// -----------------------------------------
// SCORE AN INDIVIDUAL OPPORTUNITY
// -----------------------------------------

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
  // 6. Property affordability
  // -----------------------------------------

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


      // Maximum affordability contribution = 15

      affordabilityScore =
        Math.min(
          budgetRatio * 15,
          15
        );

    } else {

      // Property exceeds user's budget

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


  // Keep reasoning between 0 and 100

  const normalizedReasoningScore =
    Math.max(
      0,
      Math.min(
        reasoningScore,
        100
      )
    );


  // Reasoning contributes maximum 25 points

  const reasoningContribution =
    normalizedReasoningScore * 0.25;


  score += reasoningContribution;


  // -----------------------------------------
  // 8. Normalize score to 0–100%
  // -----------------------------------------

  const matchPercentage =
    Math.max(
      0,
      Math.min(
        (score / MAX_SCORE) * 100,
        100
      )
    );


  // -----------------------------------------
  // 9. Return structured result
  // -----------------------------------------

  return {

    // Internal raw score
    score: Number(
      score.toFixed(2)
    ),

    // User-facing percentage
    matchPercentage: Number(
      matchPercentage.toFixed(1)
    ),

    // Maximum theoretical score
    maxScore: MAX_SCORE,

    // Score before reasoning contribution
    baseScore: Number(
      (
        score -
        reasoningContribution
      ).toFixed(2)
    ),

    // Reasoning information
    reasoningScore:
      normalizedReasoningScore,

    reasoningContribution:
      Number(
        reasoningContribution.toFixed(2)
      ),

    // Affordability information
    affordabilityScore:
      Number(
        affordabilityScore.toFixed(2)
      ),

    // Original opportunity data
    opportunity,

    // User/context data
    context

  };

}


// -----------------------------------------
// RANK MULTIPLE OPPORTUNITIES
// -----------------------------------------

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
        b.matchPercentage -
        a.matchPercentage
    );

}


// -----------------------------------------
// EXPORT MODULE
// -----------------------------------------

module.exports = {

  scoreOpportunity,

  rankOpportunities

};
