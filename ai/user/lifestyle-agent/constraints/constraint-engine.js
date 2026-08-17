/**
 * Ride2View Lifestyle Agent
 * Constraint Engine
 *
 * Purpose:
 * Determine whether an opportunity satisfies
 * the user's hard and soft constraints.
 *
 * Hard constraints:
 *   - Budget
 *   - Location
 *
 * Soft constraints:
 *   - Budget tolerance
 *   - Preference
 *   - Time
 */


const {
  numericValue,
  isBudgetHardConstraint,
  getBudgetTolerance
} = require("./constraint-rules");


/**
 * Normalize text for safe comparison.
 */
function normalizeText(value) {

  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();

}


/**
 * Check budget constraint.
 */
function evaluateBudgetConstraint(
  opportunity = {},
  context = {}
) {

  const budget =
    numericValue(
      context.budget,
      0
    );

  const price =
    numericValue(
      opportunity.price,
      0
    );


  /*
   * No usable budget.
   */
  if (budget <= 0) {

    return {

      applicable: false,

      passed: true,

      hard: false,

      budget,

      price,

      excess: 0,

      message:
        "No explicit user budget was provided."

    };

  }


  /*
   * No usable price.
   */
  if (price <= 0) {

    return {

      applicable: false,

      passed: true,

      hard: false,

      budget,

      price,

      excess: 0,

      message:
        "Opportunity price is unavailable."

    };

  }


  const hard =
    isBudgetHardConstraint(
      context
    );


  const tolerance =
    getBudgetTolerance(
      context
    );


  const maximumSoftPrice =
    budget * (1 + tolerance);


  /*
   * Within budget.
   */
  if (price <= budget) {

    return {

      applicable: true,

      passed: true,

      hard,

      budget,

      price,

      excess: 0,

      message:
        "Opportunity is within the user's budget."

    };

  }


  /*
   * Budget exceeded but soft constraint
   * still allows the opportunity.
   */
  if (
    !hard &&
    price <= maximumSoftPrice
  ) {

    return {

      applicable: true,

      passed: true,

      hard: false,

      budget,

      price,

      excess: price - budget,

      tolerance,

      maximumSoftPrice,

      warning:
        "Opportunity exceeds the preferred budget but remains within the allowed tolerance.",

      message:
        `Opportunity exceeds budget by ${price - budget}.`

    };

  }


  /*
   * Hard violation or soft tolerance exceeded.
   */
  return {

    applicable: true,

    passed: false,

    hard,

    budget,

    price,

    excess: price - budget,

    tolerance,

    maximumSoftPrice,

    message:
      `Opportunity exceeds the user's budget by ${price - budget}.`

  };

}


/**
 * Check location constraint.
 */
function evaluateLocationConstraint(
  opportunity = {},
  context = {}
) {

  const requestedCity =
    normalizeText(
      context.location?.city
    );

  const opportunityCity =
    normalizeText(
      opportunity.location?.city
    );


  /*
   * No requested location.
   */
  if (!requestedCity) {

    return {

      applicable: false,

      passed: true,

      hard: false,

      message:
        "No location constraint was provided."

    };

  }


  /*
   * No opportunity location.
   */
  if (!opportunityCity) {

    return {

      applicable: false,

      passed: true,

      hard: false,

      warning:
        "Opportunity location is unavailable."

    };

  }


  const passed =
    requestedCity === opportunityCity;


  return {

    applicable: true,

    passed,

    hard: true,

    expected: requestedCity,

    actual: opportunityCity,

    message: passed
      ? "Opportunity matches the requested location."
      : "Opportunity does not match the requested location."

  };

}


/**
 * Check explicit availability.
 */
function evaluateAvailabilityConstraint(
  opportunity = {}
) {

  const availability =
    normalizeText(
      opportunity.availability
    );


  if (!availability) {

    return {

      applicable: false,

      passed: true,

      hard: false

    };

  }


  const unavailableValues = [
    "unavailable",
    "sold",
    "rented",
    "occupied",
    "closed"
  ];


  const passed =
    !unavailableValues.includes(
      availability
    );


  return {

    applicable: true,

    passed,

    hard: true,

    actual: availability,

    message: passed
      ? "Opportunity appears available."
      : "Opportunity is unavailable."

  };

}


/**
 * Check preference compatibility.
 *
 * Preference is intentionally soft.
 */
function evaluatePreferenceConstraint(
  opportunity = {}
) {

  if (
    opportunity.preferenceMatch === true
  ) {

    return {

      applicable: true,

      passed: true,

      hard: false,

      score: 100,

      message:
        "Opportunity matches user preferences."

    };

  }


  if (
    opportunity.preferenceMatch === false
  ) {

    return {

      applicable: true,

      passed: false,

      hard: false,

      score: 0,

      message:
        "Opportunity does not strongly match user preferences."

    };

  }


  return {

    applicable: false,

    passed: true,

    hard: false,

    score: 50,

    message:
      "Preference compatibility is unknown."

  };

}


/**
 * Check time compatibility.
 *
 * Time is soft because an otherwise
 * excellent opportunity may still be useful
 * if the schedule can be adjusted.
 */
function evaluateTimeConstraint(
  opportunity = {}
) {

  if (
    opportunity.timeCompatible === true
  ) {

    return {

      applicable: true,

      passed: true,

      hard: false,

      score: 100,

      message:
        "Opportunity fits the user's available time."

    };

  }


  if (
    opportunity.timeCompatible === false
  ) {

    return {

      applicable: true,

      passed: false,

      hard: false,

      score: 0,

      message:
        "Opportunity may conflict with the user's available time."

    };

  }


  return {

    applicable: false,

    passed: true,

    hard: false,

    score: 50,

    message:
      "Time compatibility is unknown."

  };

}


/**
 * Evaluate all constraints.
 */
function evaluateConstraints(
  opportunity = {},
  context = {}
) {

  const budget =
    evaluateBudgetConstraint(
      opportunity,
      context
    );

  const location =
    evaluateLocationConstraint(
      opportunity,
      context
    );

  const availability =
    evaluateAvailabilityConstraint(
      opportunity
    );

  const preference =
    evaluatePreferenceConstraint(
      opportunity
    );

  const time =
    evaluateTimeConstraint(
      opportunity
    );


  const constraints = {

    budget,

    location,

    availability,

    preference,

    time

  };


  const violations = [];

  const warnings = [];


  Object.entries(
    constraints
  ).forEach(
    ([name, result]) => {

      if (
        result.passed === false &&
        result.hard === true
      ) {

        violations.push({
          constraint: name,
          message:
            result.message
        });

      }


      if (
        result.warning
      ) {

        warnings.push({
          constraint: name,
          message:
            result.warning
        });

      }

    }
  );


  const eligible =
    violations.length === 0;


  return {

    eligible,

    constraints,

    violations,

    warnings

  };

}


/**
 * Filter opportunities using hard constraints.
 */
function filterEligibleOpportunities(
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
      opportunity => {

        const constraintResult =
          evaluateConstraints(
            opportunity,
            context
          );


        return {

          opportunity,

          constraintResult

        };

      }
    )
    .filter(
      item =>
        item.constraintResult.eligible
    )
    .map(
      item => ({
        ...item.opportunity,

        constraintResult:
          item.constraintResult

      })
    );

}


/**
 * Evaluate and preserve all opportunities.
 *
 * Useful when the UI needs to explain
 * why something was rejected.
 */
function evaluateAllOpportunities(
  opportunities = [],
  context = {}
) {

  if (
    !Array.isArray(opportunities)
  ) {

    return [];

  }


  return opportunities.map(
    opportunity => {

      const constraintResult =
        evaluateConstraints(
          opportunity,
          context
        );


      return {

        ...opportunity,

        constraintResult

      };

    }
  );

}


module.exports = {

  normalizeText,

  evaluateBudgetConstraint,

  evaluateLocationConstraint,

  evaluateAvailabilityConstraint,

  evaluatePreferenceConstraint,

  evaluateTimeConstraint,

  evaluateConstraints,

  filterEligibleOpportunities,

  evaluateAllOpportunities

};
