/**
 * Ride2View Lifestyle Agent
 * Utility Scoring Model
 *
 * Purpose:
 * Calculate the practical utility of an opportunity
 * using multiple contextual dimensions.
 *
 * Utility dimensions:
 *
 * 1. Goal fit
 * 2. Location fit
 * 3. Budget fit
 * 4. Preference fit
 * 5. Value efficiency
 * 6. Time fit
 *
 * Final utility score:
 *
 * Goal Fit        25%
 * Location Fit    20%
 * Budget Fit      20%
 * Preference Fit  15%
 * Value Efficiency 10%
 * Time Fit        10%
 *
 * Total = 100%
 */


/**
 * Safely convert a value to a number.
 */
function numericValue(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Clamp a number between 0 and 100.
 */
function clamp(value, min = 0, max = 100) {

  return Math.min(
    max,
    Math.max(min, value)
  );

}


/**
 * Calculate goal fit.
 */
function calculateGoalFit(opportunity = {}) {

  if (
    opportunity.relevance === "high"
  ) {
    return 100;
  }

  if (
    opportunity.relevance === "medium"
  ) {
    return 60;
  }

  if (
    opportunity.relevance === "low"
  ) {
    return 30;
  }

  return 0;
}


/**
 * Calculate location fit.
 */
function calculateLocationFit(opportunity = {}) {

  if (
    opportunity.locationMatch === true
  ) {
    return 100;
  }

  if (
    opportunity.locationMatch === false
  ) {
    return 0;
  }

  return 50;
}


/**
 * Calculate budget fit.
 *
 * If the opportunity is explicitly marked
 * budget compatible, it receives a high score.
 *
 * If it exceeds the budget, the score decreases
 * according to how far above budget it is.
 */
function calculateBudgetFit(
  opportunity = {},
  context = {}
) {

  const budget =
    numericValue(
      opportunity.budget ??
      context.budget,
      0
    );

  const price =
    numericValue(
      opportunity.price,
      0
    );

  if (
    budget <= 0 ||
    price <= 0
  ) {

    if (
      opportunity.budgetCompatible === true
    ) {
      return 100;
    }

    if (
      opportunity.budgetCompatible === false
    ) {
      return 0;
    }

    return 50;
  }


  const ratio =
    price / budget;


  /*
   * At or below budget.
   */
  if (ratio <= 1) {

    /*
     * Cheaper opportunities receive
     * stronger budget utility.
     */
    return clamp(
      100 - ((ratio - 0.5) * 40)
    );

  }


  /*
   * Over budget.
   *
   * Every 10% over budget reduces
   * budget utility.
   */
  const overBudgetPercentage =
    (ratio - 1) * 100;


  return clamp(
    100 - (overBudgetPercentage * 2)
  );

}


/**
 * Calculate preference fit.
 */
function calculatePreferenceFit(
  opportunity = {}
) {

  if (
    opportunity.preferenceMatch === true
  ) {
    return 100;
  }

  if (
    opportunity.preferenceMatch === false
  ) {
    return 0;
  }

  return 50;
}


/**
 * Calculate value efficiency.
 *
 * Lower budget consumption produces
 * stronger value efficiency.
 */
function calculateValueEfficiency(
  opportunity = {},
  context = {}
) {

  const budget =
    numericValue(
      opportunity.budget ??
      context.budget,
      0
    );

  const price =
    numericValue(
      opportunity.price,
      0
    );


  /*
   * No price means we cannot measure
   * monetary efficiency directly.
   */
  if (
    budget <= 0 ||
    price <= 0
  ) {
    return 50;
  }


  const efficiency =
    (price / budget) * 100;


  /*
   * At 50% budget consumption:
   * approximately 100 utility.
   *
   * At 100%:
   * approximately 80 utility.
   *
   * Above budget:
   * utility declines further.
   */
  const value =
    120 - efficiency * 0.4;


  return clamp(value);
}


/**
 * Calculate time fit.
 */
function calculateTimeFit(
  opportunity = {}
) {

  if (
    opportunity.timeCompatible === true
  ) {
    return 100;
  }

  if (
    opportunity.timeCompatible === false
  ) {
    return 0;
  }

  return 50;
}


/**
 * Calculate overall utility score.
 */
function calculateUtilityScore(
  opportunity = {},
  context = {}
) {

  const goalFit =
    calculateGoalFit(
      opportunity
    );

  const locationFit =
    calculateLocationFit(
      opportunity
    );

  const budgetFit =
    calculateBudgetFit(
      opportunity,
      context
    );

  const preferenceFit =
    calculatePreferenceFit(
      opportunity
    );

  const valueEfficiency =
    calculateValueEfficiency(
      opportunity,
      context
    );

  const timeFit =
    calculateTimeFit(
      opportunity
    );


  const utilityScore =
      (goalFit * 0.25)
    + (locationFit * 0.20)
    + (budgetFit * 0.20)
    + (preferenceFit * 0.15)
    + (valueEfficiency * 0.10)
    + (timeFit * 0.10);


  return Number(
    clamp(utilityScore).toFixed(2)
  );

}


/**
 * Determine utility level.
 */
function getUtilityLevel(
  utilityScore
) {

  const score =
    numericValue(
      utilityScore
    );


  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "high";
  }

  if (score >= 60) {
    return "moderate";
  }

  if (score >= 40) {
    return "low";
  }

  return "poor";
}


/**
 * Generate human-readable utility explanation.
 */
function buildUtilityExplanation(
  factors,
  utilityScore
) {

  const explanations = [];


  if (factors.goalFit >= 90) {

    explanations.push(
      "Strongly aligned with the user's goal."
    );

  } else if (factors.goalFit >= 60) {

    explanations.push(
      "Moderately aligned with the user's goal."
    );

  }


  if (factors.locationFit >= 90) {

    explanations.push(
      "Strong location compatibility."
    );

  } else if (factors.locationFit < 50) {

    explanations.push(
      "Weak location compatibility."
    );

  }


  if (factors.budgetFit >= 90) {

    explanations.push(
      "Strong budget compatibility."
    );

  } else if (factors.budgetFit >= 60) {

    explanations.push(
      "Budget is reasonably compatible."
    );

  } else if (factors.budgetFit < 50) {

    explanations.push(
      "Opportunity exceeds or conflicts with the user's budget."
    );

  }


  if (factors.preferenceFit >= 90) {

    explanations.push(
      "Matches the user's stated preferences."
    );

  } else if (factors.preferenceFit < 50) {

    explanations.push(
      "Does not strongly match the user's preferences."
    );

  }


  if (factors.valueEfficiency >= 90) {

    explanations.push(
      "Provides strong value efficiency."
    );

  } else if (factors.valueEfficiency < 50) {

    explanations.push(
      "Provides relatively weak value efficiency."
    );

  }


  if (factors.timeFit >= 90) {

    explanations.push(
      "Compatible with the user's available time."
    );

  } else if (factors.timeFit < 50) {

    explanations.push(
      "May conflict with the user's available time."
    );

  }


  if (utilityScore >= 90) {

    explanations.push(
      "Overall utility is excellent."
    );

  } else if (utilityScore >= 75) {

    explanations.push(
      "Overall utility is high."
    );

  } else if (utilityScore >= 60) {

    explanations.push(
      "Overall utility is moderate."
    );

  } else {

    explanations.push(
      "Overall utility is relatively low."
    );

  }


  return explanations;
}


/**
 * Score one opportunity for practical utility.
 */
function evaluateUtility(
  opportunity = {},
  context = {}
) {

  const utilityFactors = {

    goalFit:
      calculateGoalFit(
        opportunity
      ),

    locationFit:
      calculateLocationFit(
        opportunity
      ),

    budgetFit:
      calculateBudgetFit(
        opportunity,
        context
      ),

    preferenceFit:
      calculatePreferenceFit(
        opportunity
      ),

    valueEfficiency:
      calculateValueEfficiency(
        opportunity,
        context
      ),

    timeFit:
      calculateTimeFit(
        opportunity
      )

  };


  const utilityScore =
    Number(
      (
        utilityFactors.goalFit * 0.25 +
        utilityFactors.locationFit * 0.20 +
        utilityFactors.budgetFit * 0.20 +
        utilityFactors.preferenceFit * 0.15 +
        utilityFactors.valueEfficiency * 0.10 +
        utilityFactors.timeFit * 0.10
      ).toFixed(2)
    );


  const utilityLevel =
    getUtilityLevel(
      utilityScore
    );


  const utilityExplanation =
    buildUtilityExplanation(
      utilityFactors,
      utilityScore
    );


  return {

    ...opportunity,

    utilityScore,

    utilityLevel,

    utilityFactors,

    utilityExplanation

  };

}


/**
 * Evaluate and rank opportunities
 * by utility.
 */
function rankByUtility(
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
      opportunity =>
        evaluateUtility(
          opportunity,
          context
        )
    )
    .sort(
      (a, b) => {

        const utilityA =
          numericValue(
            a.utilityScore
          );

        const utilityB =
          numericValue(
            b.utilityScore
          );


        if (
          utilityA !== utilityB
        ) {
          return utilityB - utilityA;
        }


        const scoreA =
          numericValue(
            a.score
          );

        const scoreB =
          numericValue(
            b.score
          );


        if (
          scoreA !== scoreB
        ) {
          return scoreB - scoreA;
        }


        const idA =
          String(
            a.id ?? ""
          );

        const idB =
          String(
            b.id ?? ""
          );


        return idA.localeCompare(
          idB
        );

      }
    );

}


module.exports = {

  numericValue,

  clamp,

  calculateGoalFit,

  calculateLocationFit,

  calculateBudgetFit,

  calculatePreferenceFit,

  calculateValueEfficiency,

  calculateTimeFit,

  calculateUtilityScore,

  getUtilityLevel,

  buildUtilityExplanation,

  evaluateUtility,

  rankByUtility

};
