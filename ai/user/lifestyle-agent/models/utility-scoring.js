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
 * Additional constraint layer:
 *
 * Hard Constraints
 *        ↓
 * Soft Constraints
 *        ↓
 * Utility Score
 *        ↓
 * Constraint Adjustment
 *        ↓
 * Eligibility
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
 * Normalize text.
 */
function normalize(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


/**
 * Determine whether a value represents
 * an explicitly unavailable opportunity.
 */
function isUnavailable(
  opportunity
) {

  if (
    opportunity?.available === false
  ) {

    return true;

  }

  if (
    opportunity?.isAvailable === false
  ) {

    return true;

  }

  if (
    normalize(
      opportunity?.availability
    ) === "unavailable"
  ) {

    return true;

  }

  return false;

}


/**
 * Calculate goal fit.
 */
function calculateGoalFit(
  opportunity,
  context
) {

  const goal =
    normalize(
      context?.userGoal ||
      context?.goal
    );

  if (!goal) {

    return 50;

  }


  const opportunityType =
    normalize(
      opportunity?.type
    );

  const opportunityCategory =
    normalize(
      opportunity?.category
    );

  const service =
    normalize(
      opportunity?.service
    );


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
    normalize(
      userLocation.city
    );

  const opportunityCity =
    normalize(
      opportunityLocation.city
    );


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
   * If no usable budget or price exists,
   * do not automatically penalize.
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


  /*
   * Within budget.
   */
  if (
    price <= budget
  ) {

    const ratio =
      price / budget;


    return clamp(
      100 -
      ((ratio - 0.5) * 40),
      70,
      100
    );

  }


  /*
   * Above budget.
   */
  const excess =
    (price - budget) /
    budget;


  /*
   * The further above budget,
   * the stronger the penalty.
   */
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
        normalize(preference)
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
        normalize(value)
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


  /*
   * Above-budget opportunities
   * receive progressively lower
   * value-efficiency scores.
   */
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


/* ============================================================
 * CONSTRAINT ENGINE
 * ============================================================
 */


/**
 * Determine explicit property type requirement.
 *
 * Examples:
 *
 * context.propertyType = "apartment"
 * context.propertyType = "villa"
 * context.propertyType = "bungalow"
 */
function getRequiredPropertyType(
  context
) {

  return normalize(
    context?.propertyType ||
    context?.property?.propertyType ||
    context?.requirements?.propertyType ||
    ""
  );

}


/**
 * Determine whether an opportunity
 * matches a required property type.
 */
function propertyTypeMatches(
  opportunity,
  requiredPropertyType
) {

  if (
    !requiredPropertyType
  ) {

    return true;

  }


  const actualType =
    normalize(
      opportunity?.property?.propertyType ||
      opportunity?.propertyType
    );


  if (!actualType) {

    return false;

  }


  return (
    actualType ===
    requiredPropertyType
  );

}


/**
 * Calculate constraint violations.
 *
 * Returns machine-readable constraint
 * information used by the ranking layer.
 */
function evaluateConstraints(
  opportunity,
  context = {}
) {

  const violations = [];

  const warnings = [];


  /*
   * ----------------------------------------------------------
   * AVAILABILITY
   * ----------------------------------------------------------
   */

  if (
    isUnavailable(
      opportunity
    )
  ) {

    violations.push({

      type:
        "availability",

      severity:
        "hard",

      penalty:
        100,

      message:
        "Opportunity is unavailable."

    });

  }


  /*
   * ----------------------------------------------------------
   * LOCATION
   * ----------------------------------------------------------
   */

  if (
    opportunity?.locationMatch === false
  ) {

    violations.push({

      type:
        "location",

      severity:
        "hard",

      penalty:
        60,

      message:
        "Opportunity does not match the required location."

    });

  }


  /*
   * If the user has a specific city
   * and the opportunity explicitly belongs
   * to another city, treat it as a hard
   * location mismatch.
   */

  const userCity =
    normalize(
      context?.location?.city
    );

  const opportunityCity =
    normalize(
      opportunity?.location?.city
    );


  if (
    userCity &&
    opportunityCity &&
    userCity !== opportunityCity
  ) {

    violations.push({

      type:
        "location",

      severity:
        "hard",

      penalty:
        60,

      message:
        "Opportunity is outside the user's requested city."

    });

  }


  /*
   * ----------------------------------------------------------
   * PROPERTY TYPE
   * ----------------------------------------------------------
   */

  const requiredPropertyType =
    getRequiredPropertyType(
      context
    );


  if (
    requiredPropertyType &&
    !propertyTypeMatches(
      opportunity,
      requiredPropertyType
    )
  ) {

    violations.push({

      type:
        "property-type",

      severity:
        "hard",

      penalty:
        50,

      message:
        "Opportunity does not match the required property type."

    });

  }


  /*
   * ----------------------------------------------------------
   * BUDGET
   * ----------------------------------------------------------
   */

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
    budget > 0 &&
    price > 0 &&
    price > budget
  ) {

    const excess =
      (price - budget) /
      budget;


    /*
     * Slightly above budget:
     * soft constraint.
     *
     * 0% - 10% over
     */
    if (
      excess <= 0.10
    ) {

      warnings.push({

        type:
          "budget",

        severity:
          "soft",

        penalty:
          10,

        excessPercentage:
          Number(
            (excess * 100)
              .toFixed(2)
          ),

        message:
          "Opportunity is slightly above the user's budget."

      });

    }


    /*
     * 10% - 25% over:
     * meaningful penalty.
     */
    else if (
      excess <= 0.25
    ) {

      violations.push({

        type:
          "budget",

        severity:
          "soft",

        penalty:
          25,

        excessPercentage:
          Number(
            (excess * 100)
              .toFixed(2)
          ),

        message:
          "Opportunity exceeds the user's budget."

      });

    }


    /*
     * More than 25% above budget:
     * strong constraint violation.
     */
    else {

      violations.push({

        type:
          "budget",

        severity:
          "hard",

        penalty:
          50,

        excessPercentage:
          Number(
            (excess * 100)
              .toFixed(2)
          ),

        message:
          "Opportunity significantly exceeds the user's budget."

      });

    }

  }


  /*
   * ----------------------------------------------------------
   * TIME
   * ----------------------------------------------------------
   */

  if (
    opportunity?.timeCompatible === false
  ) {

    violations.push({

      type:
        "time",

      severity:
        "soft",

      penalty:
        20,

      message:
        "Opportunity does not match the user's available time."

    });

  }


  /*
   * ----------------------------------------------------------
   * PREFERENCE
   * ----------------------------------------------------------
   */

  if (
    opportunity?.preferenceMatch === false
  ) {

    warnings.push({

      type:
        "preference",

      severity:
        "soft",

      penalty:
        10,

      message:
        "Opportunity does not match the user's stated preferences."

    });

  }


  /*
   * ----------------------------------------------------------
   * TOTAL PENALTY
   * ----------------------------------------------------------
   */

  const hardViolations =
    violations.filter(
      violation =>
        violation.severity === "hard"
    );


  const softViolations =
    violations.filter(
      violation =>
        violation.severity === "soft"
    );


  const hardPenalty =
    hardViolations.reduce(
      (
        total,
        violation
      ) =>
        total +
        safeNumber(
          violation.penalty,
          0
        ),
      0
    );


  const softPenalty =
    softViolations.reduce(
      (
        total,
        violation
      ) =>
        total +
        safeNumber(
          violation.penalty,
          0
        ),
      0
    );


  const warningPenalty =
    warnings.reduce(
      (
        total,
        warning
      ) =>
        total +
        safeNumber(
          warning.penalty,
          0
        ),
      0
    );


  const totalPenalty =
    hardPenalty +
    softPenalty +
    warningPenalty;


  /*
   * Hard constraints determine eligibility.
   *
   * Availability and explicit location/property
   * mismatches make the opportunity ineligible.
   *
   * Severe budget violations are also treated
   * as ineligible.
   */
  const eligible =
    hardViolations.length === 0;


  let constraintStatus =
    "clear";


  if (
    hardViolations.length > 0
  ) {

    constraintStatus =
      "blocked";

  }
  else if (
    violations.length > 0 ||
    warnings.length > 0
  ) {

    constraintStatus =
      "warning";

  }


  return {

    eligible,

    constraintStatus,

    constraintPenalty:
      clamp(
        totalPenalty,
        0,
        100
      ),

    hardPenalty:
      clamp(
        hardPenalty,
        0,
        100
      ),

    softPenalty:
      clamp(
        softPenalty,
        0,
        100
      ),

    warnings,

    violations,

    hardViolations,

    softViolations

  };

}


/**
 * Apply constraint penalty to utility score.
 *
 * Hard-blocked opportunities receive a maximum
 * score of 0.
 *
 * Non-blocked opportunities are penalized
 * proportionally.
 */
function applyConstraintPenalty(
  utilityScore,
  constraints
) {

  if (
    !constraints
  ) {

    return utilityScore;

  }


  if (
    constraints.eligible === false
  ) {

    return 0;

  }


  const penalty =
    safeNumber(
      constraints.constraintPenalty,
      0
    );


  return Number(
    clamp(
      utilityScore -
      penalty,
      0,
      100
    )
      .toFixed(2)
  );

}


/**
 * ============================================================
 * OVERALL UTILITY SCORE
 * ============================================================
 */


/**
 * Calculate overall utility score.
 *
 * Weighted utility model:
 *
 * Goal        = 25%
 * Location    = 20%
 * Budget      = 20%
 * Preference  = 15%
 * Value       = 10%
 * Time        = 10%
 */
function calculateUtilityScore(
  factors
) {

  const score =

    (factors.goalFit * 0.25) +

    (factors.locationFit * 0.20) +

    (factors.budgetFit * 0.20) +

    (factors.preferenceFit * 0.15) +

    (factors.valueEfficiency * 0.10) +

    (factors.timeFit * 0.10);


  return Number(
    clamp(
      score,
      0,
      100
    )
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
  utilityLevel,
  constraints = {}
) {

  const explanations = [];


  /*
   * Goal
   */

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
  else {

    explanations.push(
      "Weak alignment with the user's goal."
    );

  }


  /*
   * Location
   */

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


  /*
   * Budget
   */

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


  /*
   * Preferences
   */

  if (
    factors.preferenceFit >= 80
  ) {

    explanations.push(
      "Matches the user's stated preferences."
    );

  }
  else if (
    factors.preferenceFit < 50
  ) {

    explanations.push(
      "Does not strongly match the user's stated preferences."
    );

  }


  /*
   * Value
   */

  if (
    factors.valueEfficiency >= 80
  ) {

    explanations.push(
      "Provides strong value efficiency."
    );

  }
  else if (
    factors.valueEfficiency < 50
  ) {

    explanations.push(
      "Value efficiency is limited."
    );

  }


  /*
   * Time
   */

  if (
    factors.timeFit >= 80
  ) {

    explanations.push(
      "Compatible with the user's available time."
    );

  }
  else if (
    factors.timeFit < 50
  ) {

    explanations.push(
      "Time compatibility is limited."
    );

  }


  /*
   * Constraint explanations
   */

  if (
    constraints?.constraintStatus ===
    "blocked"
  ) {

    explanations.push(
      "This opportunity violates one or more hard constraints."
    );

  }
  else if (
    constraints?.constraintStatus ===
    "warning"
  ) {

    explanations.push(
      "This opportunity has one or more constraint warnings."
    );

  }


  /*
   * Specific violations.
   */

  if (
    Array.isArray(
      constraints?.violations
    )
  ) {

    constraints.violations.forEach(
      violation => {

        if (
          violation?.message
        ) {

          explanations.push(
            violation.message
          );

        }

      }
    );

  }


  explanations.push(
    `Overall utility is ${utilityLevel}.`
  );


  return explanations;

}


/**
 * ============================================================
 * SCORE ONE OPPORTUNITY
 * ============================================================
 */


/**
 * Score one opportunity.
 */
function scoreUtility(
  opportunity,
  context = {}
) {

  /*
   * Calculate utility factors.
   */

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


  /*
   * Base utility score.
   */

  const baseUtilityScore =
    calculateUtilityScore(
      factors
    );


  /*
   * Evaluate hard and soft constraints.
   */

  const constraints =
    evaluateConstraints(
      opportunity,
      context
    );


  /*
   * Apply constraint adjustment.
   */

  const utilityScore =
    applyConstraintPenalty(
      baseUtilityScore,
      constraints
    );


  /*
   * Utility level is determined AFTER
   * constraint penalties.
   */

  const utilityLevel =
    determineUtilityLevel(
      utilityScore
    );


  /*
   * Build explanation using both
   * utility factors and constraints.
   */

  const utilityExplanation =
    buildUtilityExplanation(
      factors,
      utilityLevel,
      constraints
    );


  return {

    ...opportunity,

    /*
     * Base score before constraints.
     */
    baseUtilityScore,

    /*
     * Final score after constraints.
     */
    utilityScore,

    utilityLevel,

    utilityFactors:
      factors,

    utilityExplanation,

    /*
     * Constraint intelligence.
     */
    eligible:
      constraints.eligible,

    constraintStatus:
      constraints.constraintStatus,

    constraintPenalty:
      constraints.constraintPenalty,

    constraintViolations:
      constraints.violations,

    constraintWarnings:
      constraints.warnings

  };

}


/**
 * ============================================================
 * RANKING
 * ============================================================
 */


/**
 * Rank opportunities by utility.
 *
 * Eligible opportunities are always ranked
 * before blocked opportunities.
 *
 * Within each group, utility score determines rank.
 */
function rankByUtility(
  opportunities,
  context = {}
) {

  if (
    !Array.isArray(
      opportunities
    )
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
      (a, b) => {

        /*
         * Eligible opportunities first.
         */
        if (
          a.eligible !==
          b.eligible
        ) {

          return a.eligible
            ? -1
            : 1;

        }


        /*
         * Then utility score.
         */
        if (
          b.utilityScore !==
          a.utilityScore
        ) {

          return (
            b.utilityScore -
            a.utilityScore
          );

        }


        /*
         * Then original opportunity score
         * as a tie breaker.
         */
        return (
          safeNumber(
            b.score,
            0
          ) -
          safeNumber(
            a.score,
            0
          )
        );

      }
    )
    .map(
      (
        opportunity,
        index
      ) => ({

        ...opportunity,

        utilityRank:
          index + 1

      })
    );

}


/**
 * ============================================================
 * PUBLIC API
 * ============================================================
 */

module.exports = {

  /*
   * Main engine.
   */

  rankByUtility,

  scoreUtility,


  /*
   * Existing utility functions.
   */

  calculateGoalFit,

  calculateLocationFit,

  calculateBudgetFit,

  calculatePreferenceFit,

  calculateValueEfficiency,

  calculateTimeFit,

  calculateUtilityScore,

  determineUtilityLevel,

  buildUtilityExplanation,


  /*
   * New constraint engine.
   */

  evaluateConstraints,

  applyConstraintPenalty,

  propertyTypeMatches,

  getRequiredPropertyType,

  isUnavailable

};
