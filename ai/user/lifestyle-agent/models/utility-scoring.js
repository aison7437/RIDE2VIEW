/**
 * Ride2View Lifestyle Agent
 * Utility Scoring Engine
 *
 * Purpose:
 * Determines the practical usefulness of each opportunity
 * after relevance and opportunity scoring have been calculated.
 *
 * Utility considers:
 *
 * Goal Fit
 * Location Fit
 * Budget Fit
 * Preference Fit
 * Value Efficiency
 * Time Fit
 *
 * Pipeline:
 *
 * Opportunity Score
 *        ↓
 * Utility Score
 *        ↓
 * Utility Ranking
 *        ↓
 * Recommendation Decision
 */


/**
 * Safely convert a value to a number.
 */
function safeNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Clamp a number between minimum and maximum.
 */
function clamp(
  value,
  minimum = 0,
  maximum = 100
) {

  return Math.min(
    Math.max(
      safeNumber(value, minimum),
      minimum
    ),
    maximum
  );

}


/**
 * Calculate goal fit.
 */
function calculateGoalFit(
  opportunity,
  context
) {

  const goal =
    String(
      context?.userGoal ||
      context?.goal ||
      ""
    ).toLowerCase();

  if (!goal) {
    return 50;
  }

  const opportunityType =
    String(
      opportunity?.type ||
      ""
    ).toLowerCase();

  const opportunityCategory =
    String(
      opportunity?.category ||
      ""
    ).toLowerCase();

  const service =
    String(
      opportunity?.service ||
      ""
    ).toLowerCase();

  if (
    opportunityType === goal ||
    opportunityCategory === goal ||
    service.includes(goal) ||
    goal.includes(opportunityType) ||
    goal.includes(opportunityCategory)
  ) {

    return 100;

  }

  if (
    opportunity?.relevance === "high"
  ) {

    return 80;

  }

  if (
    opportunity?.relevance === "medium"
  ) {

    return 60;

  }

  return 30;

}


/**
 * Calculate location compatibility.
 */
function calculateLocationFit(
  opportunity,
  context
) {

  const userLocation =
    context?.location || {};

  const opportunityLocation =
    opportunity?.location || {};

  const userCity =
    String(
      userLocation.city ||
      ""
    ).toLowerCase();

  const opportunityCity =
    String(
      opportunityLocation.city ||
      ""
    ).toLowerCase();

  if (
    userCity &&
    opportunityCity &&
    userCity === opportunityCity
  ) {

    return 100;

  }

  if (
    opportunity?.locationMatch === true
  ) {

    return 100;

  }

  if (
    opportunity?.locationMatch === false
  ) {

    return 20;

  }

  return 50;

}


/**
 * Calculate budget compatibility.
 */
function calculateBudgetFit(
  opportunity,
  context
) {

  const budget =
    safeNumber(
      context?.budget,
      0
    );

  const price =
    safeNumber(
      opportunity?.price,
      0
    );

  /*
   * If no budget or no price exists,
   * do not automatically penalize the opportunity.
   */
  if (
    budget <= 0 ||
    price <= 0
  ) {

    if (
      opportunity?.budgetCompatible === true
    ) {

      return 100;

    }

    if (
      opportunity?.budgetCompatible === false
    ) {

      return 40;

    }

    return 50;

  }


  if (
    price <= budget
  ) {

    const ratio =
      price / budget;

    /*
     * Lower cost relative to budget
     * receives a stronger budget score.
     */
    return clamp(
      100 -
      ((ratio - 0.5) * 40),
      70,
      100
    );

  }


  /*
   * Penalize opportunities above budget.
   */
  const excess =
    (price - budget) /
    budget;

  return clamp(
    70 -
    (excess * 100),
    0,
    70
  );

}


/**
 * Calculate preference fit.
 */
function calculatePreferenceFit(
  opportunity,
  context
) {

  const preferences =
    Array.isArray(
      context?.user?.preferences
    )
      ? context.user.preferences
      : [];

  if (
    preferences.length === 0
  ) {

    return 50;

  }

  const normalizedPreferences =
    preferences.map(
      preference =>
        String(preference)
          .toLowerCase()
    );

  const opportunityValues = [

    opportunity?.type,

    opportunity?.category,

    opportunity?.service,

    opportunity?.property?.propertyType

  ]
    .filter(Boolean)
    .map(
      value =>
        String(value)
          .toLowerCase()
    );


  const matches =
    normalizedPreferences.filter(
      preference =>

        opportunityValues.some(
          value =>
            value.includes(
              preference
            ) ||
            preference.includes(
              value
            )
        )

    );


  if (
    matches.length > 0
  ) {

    return 100;

  }

  if (
    opportunity?.preferenceMatch === true
  ) {

    return 100;

  }

  if (
    opportunity?.preferenceMatch === false
  ) {

    return 0;

  }

  return 50;

}


/**
 * Calculate value efficiency.
 *
 * For priced opportunities:
 * cheaper opportunities receive
 * stronger efficiency scores.
 */
function calculateValueEfficiency(
  opportunity,
  context
) {

  const budget =
    safeNumber(
      context?.budget,
      0
    );

  const price =
    safeNumber(
      opportunity?.price,
      0
    );


  if (
    price <= 0
  ) {

    return 50;

  }


  if (
    budget <= 0
  ) {

    return 70;

  }


  if (
    price <= budget
  ) {

    return clamp(
      100 -
      ((price / budget) * 30),
      50,
      100
    );

  }


  return clamp(
    100 -
    (((price - budget) / budget) * 100),
    0,
    100
  );

}


/**
 * Calculate time compatibility.
 */
function calculateTimeFit(
  opportunity,
  context
) {

  if (
    opportunity?.timeCompatible === true
  ) {

    return 100;

  }

  if (
    opportunity?.timeCompatible === false
  ) {

    return 30;

  }

  if (
    context?.availableTime
  ) {

    return 80;

  }

  return 50;

}


/**
 * Calculate overall utility score.
 */
function calculateUtilityScore(
  factors
) {

  /*
   * Weighted utility model.
   *
   * Goal        = 25%
   * Location    = 20%
   * Budget      = 20%
   * Preference  = 15%
   * Value       = 10%
   * Time        = 10%
   */

  const score =

    (factors.goalFit * 0.25) +

    (factors.locationFit * 0.20) +

    (factors.budgetFit * 0.20) +

    (factors.preferenceFit * 0.15) +

    (factors.valueEfficiency * 0.10) +

    (factors.timeFit * 0.10);


  return Number(
    clamp(score, 0, 100)
      .toFixed(2)
  );

}


/**
 * Determine utility level.
 */
function determineUtilityLevel(
  utilityScore
) {

  if (
    utilityScore >= 90
  ) {

    return "excellent";

  }

  if (
    utilityScore >= 75
  ) {

    return "high";

  }

  if (
    utilityScore >= 60
  ) {

    return "moderate";

  }

  if (
    utilityScore >= 40
  ) {

    return "low";

  }

  return "poor";

}


/**
 * Build utility explanation.
 */
function buildUtilityExplanation(
  factors,
  utilityLevel
) {

  const explanations = [];


  if (
    factors.goalFit >= 80
  ) {

    explanations.push(
      "Strongly aligned with the user's goal."
    );

  }
  else if (
    factors.goalFit >= 60
  ) {

    explanations.push(
      "Moderately aligned with the user's goal."
    );

  }


  if (
    factors.locationFit >= 80
  ) {

    explanations.push(
      "Strong location compatibility."
    );

  }
  else if (
    factors.locationFit < 50
  ) {

    explanations.push(
      "Location compatibility is limited."
    );

  }


  if (
    factors.budgetFit >= 80
  ) {

    explanations.push(
      "Strong budget compatibility."
    );

  }
  else if (
    factors.budgetFit >= 50
  ) {

    explanations.push(
      "Acceptable budget compatibility."
    );

  }
  else {

    explanations.push(
      "Budget compatibility is limited."
    );

  }


  if (
    factors.preferenceFit >= 80
  ) {

    explanations.push(
      "Matches the user's stated preferences."
    );

  }


  if (
    factors.valueEfficiency >= 80
  ) {

    explanations.push(
      "Provides strong value efficiency."
    );

  }


  if (
    factors.timeFit >= 80
  ) {

    explanations.push(
      "Compatible with the user's available time."
    );

  }


  explanations.push(
    `Overall utility is ${utilityLevel}.`
  );


  return explanations;

}


/**
 * Score one opportunity.
 */
function scoreUtility(
  opportunity,
  context = {}
) {

  const factors = {

    goalFit:
      calculateGoalFit(
        opportunity,
        context
      ),

    locationFit:
      calculateLocationFit(
        opportunity,
        context
      ),

    budgetFit:
      calculateBudgetFit(
        opportunity,
        context
      ),

    preferenceFit:
      calculatePreferenceFit(
        opportunity,
        context
      ),

    valueEfficiency:
      calculateValueEfficiency(
        opportunity,
        context
      ),

    timeFit:
      calculateTimeFit(
        opportunity,
        context
      )

  };


  const utilityScore =
    calculateUtilityScore(
      factors
    );


  const utilityLevel =
    determineUtilityLevel(
      utilityScore
    );


  return {

    ...opportunity,

    utilityScore,

    utilityLevel,

    utilityFactors:
      factors,

    utilityExplanation:
      buildUtilityExplanation(
        factors,
        utilityLevel
      )

  };

}


/**
 * Rank opportunities by utility.
 */
function rankByUtility(
  opportunities,
  context = {}
) {

  if (
    !Array.isArray(opportunities)
  ) {

    return [];

  }


  const scored =
    opportunities.map(
      opportunity =>
        scoreUtility(
          opportunity,
          context
        )
    );


  return scored
    .sort(
      (a, b) =>
        b.utilityScore -
        a.utilityScore
    )
    .map(
      (opportunity, index) => ({

        ...opportunity,

        utilityRank:
          index + 1

      })
    );

}


module.exports = {

  rankByUtility,

  scoreUtility,

  calculateGoalFit,

  calculateLocationFit,

  calculateBudgetFit,

  calculatePreferenceFit,

  calculateValueEfficiency,

  calculateTimeFit,

  calculateUtilityScore,

  determineUtilityLevel,

  buildUtilityExplanation

};
