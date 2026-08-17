/**
 * Ride2View Lifestyle Agent
 * Constraint Rules
 *
 * Defines hard and soft constraints used
 * before utility scoring.
 */


/**
 * Safely convert value to number.
 */
function numericValue(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Determine whether budget is a hard constraint.
 *
 * Default:
 * If context.budgetHardConstraint is explicitly false,
 * budget becomes soft.
 *
 * Otherwise budget is treated as hard.
 */
function isBudgetHardConstraint(context = {}) {

  return context.budgetHardConstraint !== false;

}


/**
 * Get budget tolerance.
 *
 * Used only when budget is a soft constraint.
 *
 * Example:
 * budget = 50,000
 * tolerance = 0.10
 *
 * Maximum acceptable price:
 * 55,000
 */
function getBudgetTolerance(context = {}) {

  const tolerance =
    numericValue(
      context.budgetTolerance,
      0.10
    );

  return Math.max(
    0,
    Math.min(
      tolerance,
      1
    )
  );

}


module.exports = {

  numericValue,

  isBudgetHardConstraint,

  getBudgetTolerance

};
