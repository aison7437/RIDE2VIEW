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
 * 1. Goal fit              25%
 * 2. Location fit          20%
 * 3. Budget fit            20%
 * 4. Preference fit        15%
 * 5. Value efficiency      10%
 * 6. Time fit              10%
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

  const number = numericValue(value, min);

  return Math.min(
    max,
    Math.max(min, number)
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
 * Uses explicit budget compatibility when
 * available, while still calculating a
 * contextual score from price and budget.
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


  /*
   * If the opportunity already contains
   * an explicit compatibility decision,
   * respect it when price/budget data
   * is unavailable.
   */
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
   *
   * Lower cost gets better budget utility,
   * but the model does not excessively reward
   * extremely cheap opportunities.
   */
  if (ratio <= 1) {

    if (ratio <= 0.5) {
      return 100;
    }

    return clamp(
      120 - (ratio * 40)
    );

  }


  /*
   * Over budget.
   *
   * Every 10% above budget reduces utility.
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
 * This measures how efficiently the opportunity
 * uses the user's available budget.
 *
 * Returns:
 *
 * 100 = extremely efficient
 * 80  = approximately at budget
 * 60  = moderately above budget
 * 0   = severely above budget
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
   * No monetary information.
   */
  if (
    budget <= 0 ||
    price <= 0
  ) {
    return 50;
  }


  const ratio =
    price / budget;


  /*
   * At or below budget.
   */
  if (ratio <= 1) {

    /*
     * 50% of budget → 100
     * 75% of budget → 90
     * 100% of budget → 80
     */
    return clamp(
      100 - ((ratio - 0.5) * 40)
    );

  }


  /*
   * Above budget.
   *
   * Penalize over-budget opportunities
   * more aggressively.
   */
  const overBudget =
    (ratio - 1) * 100;


  return clamp(
    80 - (overBudget * 1.5)
  );

}


/**
 * Calculate budget efficiency.
 *
 * This is retained as a separate metric because
 * it is useful for recommendation explanations,
 * analytics, and future ranking models.
 */
function calculateBudgetEfficiency(
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
    return 50;
  }


  const ratio =
    price / budget;


  /*
   * Within budget.
   */
  if (ratio <= 1) {

    return clamp(
      100 - (ratio * 30)
    );

  }


  /*
   * Above budget.
   */
  const overBudget =
    (ratio - 1) * 100;


  return clamp(
    70 - (overBudget * 2)
  );

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


  /*
   * Goal.
   */
  if (
    factors.goalFit >= 90
  ) {

    explanations.push(
      "Strongly aligned with the user's goal."
    );

  } else if (
    factors.goalFit >= 60
  ) {

    explanations.push(
      "Moderately aligned with the user's goal."
    );

  } else {

    explanations.push(
      "Weak alignment with the user's goal."
    );

  }


  /*
   * Location.
   */
  if (
    factors.locationFit >= 90
  ) {

    explanations.push(
      "Strong location compatibility."
    );

  } else if (
    factors.locationFit >= 50
  ) {

    explanations.push(
      "Reasonable location compatibility."
    );

  } else {

    explanations.push(
      "Weak location compatibility."
    );

  }


  /*
   * Budget.
   */
  if (
    factors.budgetFit >= 90
  ) {

    explanations.push(
      "Strong budget compatibility."
    );

  } else if (
    factors.budgetFit >= 60
  ) {

    explanations.push(
      "Budget is reasonably compatible."
    );

  } else {

    explanations.push(
      "Opportunity exceeds or conflicts with the user's budget."
    );

  }


  /*
   * Preferences.
   */
  if (
    factors.preferenceFit >= 90
  ) {

    explanations.push(
      "Matches the user's stated preferences."
    );

  } else if (
    factors.preferenceFit >= 50
  ) {

    explanations.push(
      "Partially matches the user's preferences."
    );

  } else {

    explanations.push(
      "Does not strongly match the user's preferences."
    );

  }


  /*
   * Value.
   */
  if (
    factors.valueEfficiency >= 90
  ) {

    explanations.push(
      "Provides strong value efficiency."
    );

  } else if (
    factors.valueEfficiency >= 60
  ) {

    explanations.push(
      "Provides reasonable value efficiency."
    );

  } else {

    explanations.push(
      "Provides relatively weak value efficiency."
    );

  }


  /*
   * Time.
   */
  if (
    factors.timeFit >= 90
  ) {

    explanations.push(
      "Compatible with the user's available time."
    );

  } else if (
    factors.timeFit >= 50
  ) {

    explanations.push(
      "May be compatible with the user's available time."
    );

  } else {

    explanations.push(
      "May conflict with the user's available time."
    );

  }


  /*
   * Overall utility.
   */
  if (
    utilityScore >= 90
  ) {

    explanations.push(
      "Overall utility is excellent."
    );

  } else if (
    utilityScore >= 75
  ) {

    explanations.push(
      "Overall utility is high."
    );

  } else if (
    utilityScore >= 60
  ) {

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
 * Evaluate one opportunity.
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


  const budgetEfficiency =
    calculateBudgetEfficiency(
      opportunity,
      context
    );


  return {

    ...opportunity,

    utilityScore,

    utilityLevel,

    utilityFactors,

    utilityExplanation,

    budgetEfficiency

  };

}


/**
 * Evaluate and rank opportunities by utility.
 *
 * Utility is the primary ordering criterion.
 * Existing opportunity score is used as a
 * secondary tie-breaker.
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


        /*
         * Primary:
         * utility score.
         */
        if (
          utilityA !== utilityB
        ) {

          return utilityB - utilityA;

        }


        /*
         * Secondary:
         * existing opportunity score.
         */
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


        /*
         * Final deterministic tie-breaker.
         */
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


/**
 * Export utility model.
 */
module.exports = {

  numericValue,

  clamp,

  calculateGoalFit,

  calculateLocationFit,

  calculateBudgetFit,

  calculatePreferenceFit,

  calculateValueEfficiency,

  calculateBudgetEfficiency,

  calculateTimeFit,

  calculateUtilityScore,

  getUtilityLevel,

  buildUtilityExplanation,

  evaluateUtility,

  rankByUtility

};
