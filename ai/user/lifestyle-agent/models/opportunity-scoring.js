/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring & Ranking Model
 *
 * Ranking hierarchy:
 *
 * 1. Overall score          DESC
 * 2. Match percentage       DESC
 * 3. Budget efficiency      ASC
 * 4. Opportunity ID         ASC
 *
 * Lower budget efficiency means
 * the opportunity consumes less of
 * the user's available budget.
 */


/**
 * Calculate budget efficiency.
 *
 * Example:
 * Budget = 50,000
 * Price  = 35,000
 *
 * Efficiency = 70%
 *
 * Lower is better.
 */
function calculateBudgetEfficiency(
  opportunity = {},
  context = {}
) {

  const budget =
    Number(
      opportunity.budget ??
      context.budget
    );

  const price =
    Number(
      opportunity.price
    );

  if (
    !Number.isFinite(budget) ||
    budget <= 0 ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return 0;
  }

  return Number(
    ((price / budget) * 100).toFixed(2)
  );
}


/**
 * Calculate match percentage.
 *
 * The percentage is derived from
 * compatibility signals when one
 * does not already exist.
 */
function calculateMatchPercentage(
  opportunity = {}
) {

  if (
    Number.isFinite(
      Number(opportunity.matchPercentage)
    )
  ) {
    return Number(
      opportunity.matchPercentage
    );
  }

  const signals = [
    opportunity.locationMatch,
    opportunity.budgetCompatible,
    opportunity.timeCompatible,
    opportunity.preferenceMatch
  ];

  const availableSignals =
    signals.filter(
      signal => typeof signal === "boolean"
    );

  if (
    availableSignals.length === 0
  ) {
    return 0;
  }

  const matches =
    availableSignals.filter(
      signal => signal === true
    ).length;

  return Number(
    (
      (matches / availableSignals.length) *
      100
    ).toFixed(2)
  );
}


/**
 * Calculate the overall opportunity score.
 *
 * Existing scoring signals are preserved.
 */
function calculateOpportunityScore(
  opportunity = {},
  context = {}
) {

  const reasoningScore =
    Number(
      opportunity.reasoningScore
    ) || 0;

  const matchPercentage =
    calculateMatchPercentage(
      opportunity
    );

  /*
   * Base score combines reasoning
   * with contextual compatibility.
   */
  let score = reasoningScore;

  if (
    opportunity.locationMatch === true
  ) {
    score += 15;
  }

  if (
    opportunity.budgetCompatible === true
  ) {
    score += 15;
  }

  if (
    opportunity.timeCompatible === true
  ) {
    score += 10;
  }

  if (
    opportunity.preferenceMatch === true
  ) {
    score += 10;
  }

  /*
   * Preserve existing score if one
   * has already been calculated and
   * is numerically valid.
   */
  if (
    Number.isFinite(
      Number(opportunity.score)
    )
  ) {
    score =
      Number(opportunity.score);
  }

  return Number(
    score.toFixed(2)
  );
}


/**
 * Score a single opportunity.
 */
function scoreOpportunity(
  opportunity = {},
  context = {}
) {

  const score =
    calculateOpportunityScore(
      opportunity,
      context
    );

  const matchPercentage =
    calculateMatchPercentage(
      opportunity
    );

  const budgetEfficiency =
    calculateBudgetEfficiency(
      opportunity,
      context
    );

  return {

    ...opportunity,

    score,

    matchPercentage,

    budgetEfficiency

  };
}


/**
 * Rank opportunities using deterministic
 * multi-level sorting.
 *
 * Priority:
 *
 * score DESC
 * ↓
 * matchPercentage DESC
 * ↓
 * budgetEfficiency ASC
 * ↓
 * opportunity ID ASC
 */
function rankOpportunities(
  opportunities = [],
  context = {}
) {

  if (
    !Array.isArray(opportunities)
  ) {
    return [];
  }


  /*
   * First calculate all scoring signals.
   */
  const scored =
    opportunities.map(
      opportunity =>
        scoreOpportunity(
          opportunity,
          context
        )
    );


  /*
   * Deterministic ranking.
   */
  scored.sort(
    (a, b) => {

      // -----------------------------------
      // 1. Overall score — HIGHER first
      // -----------------------------------

      const scoreA =
        Number(a.score) || 0;

      const scoreB =
        Number(b.score) || 0;

      if (
        scoreA !== scoreB
      ) {
        return scoreB - scoreA;
      }


      // -----------------------------------
      // 2. Match percentage — HIGHER first
      // -----------------------------------

      const matchA =
        Number(
          a.matchPercentage
        ) || 0;

      const matchB =
        Number(
          b.matchPercentage
        ) || 0;

      if (
        matchA !== matchB
      ) {
        return matchB - matchA;
      }


      // -----------------------------------
      // 3. Budget efficiency — LOWER first
      // -----------------------------------

      const efficiencyA =
        Number(
          a.budgetEfficiency
        );

      const efficiencyB =
        Number(
          b.budgetEfficiency
        );

      const safeEfficiencyA =
        Number.isFinite(
          efficiencyA
        )
          ? efficiencyA
          : Number.POSITIVE_INFINITY;

      const safeEfficiencyB =
        Number.isFinite(
          efficiencyB
        )
          ? efficiencyB
          : Number.POSITIVE_INFINITY;

      if (
        safeEfficiencyA !==
        safeEfficiencyB
      ) {
        return (
          safeEfficiencyA -
          safeEfficiencyB
        );
      }


      // -----------------------------------
      // 4. Opportunity ID — ASCENDING
      // -----------------------------------

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


  return scored;
}


module.exports = {

  calculateBudgetEfficiency,

  calculateMatchPercentage,

  calculateOpportunityScore,

  scoreOpportunity,

  rankOpportunities

};
