/**
 * Ride2View Lifestyle Agent
 * Recommendation Decision Engine
 *
 * Converts ranked opportunities into explicit decisions.
 *
 * Decision hierarchy:
 *
 * 1. Goal alignment
 * 2. Location compatibility
 * 3. Budget compatibility
 * 4. Preference compatibility
 * 5. Overall score
 * 6. Budget efficiency
 * 7. Ranking position
 */

function makeRecommendationDecision(
  opportunities = [],
  context = {}
) {

  if (!Array.isArray(opportunities)) {
    return {
      enabled: true,
      count: 0,
      primary: null,
      recommendations: []
    };
  }

  if (opportunities.length === 0) {
    return {
      enabled: true,
      count: 0,
      primary: null,
      recommendations: []
    };
  }

  const scored = opportunities.map((opportunity, index) => {

    const goalAlignment =
      opportunity.relevance === "high" ? 1 : 0;

    const locationMatch =
      opportunity.locationMatch === true ? 1 : 0;

    const budgetMatch =
      opportunity.budgetCompatible === true ? 1 : 0;

    const preferenceMatch =
      opportunity.preferenceMatch === true ? 1 : 0;

    const score =
      Number(opportunity.score) || 0;

    const budgetEfficiency =
      Number(opportunity.budgetEfficiency) || 0;

    const ranking =
      Number(opportunity.rank) || index + 1;

    /*
     * Decision score.
     *
     * We deliberately keep the existing opportunity
     * score dominant while adding deterministic
     * decision signals.
     */

    const decisionScore =
      (goalAlignment * 1000) +
      (locationMatch * 500) +
      (budgetMatch * 400) +
      (preferenceMatch * 300) +
      (score * 10) -
      (budgetEfficiency * 0.1) -
      ranking;

    return {
      ...opportunity,
      decisionScore
    };

  });


  /*
   * Sort candidates by decision score.
   */

  const sorted =
    [...scored].sort(
      (a, b) =>
        b.decisionScore - a.decisionScore
    );


  /*
   * Primary recommendation.
   */

  const primary =
    sorted[0] || null;


  /*
   * Attach explicit decisions.
   */

  const recommendations =
    sorted.map((opportunity, index) => {

      const isPrimary =
        opportunity.id === primary?.id;

      return {

        ...opportunity,

        decision:
          isPrimary
            ? "primary"
            : "alternative",

        primary:
          isPrimary,

        rank:
          index + 1,

        priority:
          isPrimary
            ? "high"
            : index === 1
              ? "medium"
              : "low",

        decisionScore:
          opportunity.decisionScore,

        decisionReasons:
          buildDecisionReasons(
            opportunity,
            context,
            isPrimary
          )
      };

    });


  return {

    enabled: true,

    count:
      recommendations.length,

    primary:
      primary?.id || null,

    recommendations

  };

}


/**
 * Explain why an opportunity received its decision.
 */

function buildDecisionReasons(
  opportunity,
  context,
  isPrimary
) {

  const reasons = [];


  if (
    opportunity.relevance === "high"
  ) {
    reasons.push(
      "Strong alignment with the user's goal"
    );
  }


  if (
    opportunity.locationMatch === true
  ) {
    reasons.push(
      "Matches the user's location"
    );
  }


  if (
    opportunity.budgetCompatible === true
  ) {
    reasons.push(
      "Within the user's budget"
    );
  }


  if (
    opportunity.preferenceMatch === true
  ) {
    reasons.push(
      "Matches user preferences"
    );
  }


  if (
    isPrimary
  ) {
    reasons.push(
      "Best overall decision among available opportunities"
    );
  }


  return reasons;

}


module.exports = {
  makeRecommendationDecision
};
