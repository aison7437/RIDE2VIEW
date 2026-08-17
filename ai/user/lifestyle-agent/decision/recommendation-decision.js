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
 * 7. Existing ranking
 * 8. Stable original order
 *
 * The hierarchy is lexicographic:
 * higher-priority signals always beat lower-priority signals.
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


  // -----------------------------------------
  // 1. Build decision profiles
  // -----------------------------------------

  const scored =
    opportunities.map((opportunity, index) => {

      const goalAlignment =
        opportunity.relevance === "high"
          ? 1
          : 0;

      const locationMatch =
        opportunity.locationMatch === true
          ? 1
          : 0;

      const budgetMatch =
        opportunity.budgetCompatible === true
          ? 1
          : 0;

      const preferenceMatch =
        opportunity.preferenceMatch === true
          ? 1
          : 0;

      const score =
        Number.isFinite(
          Number(opportunity.score)
        )
          ? Number(opportunity.score)
          : 0;

      const budgetEfficiency =
        Number.isFinite(
          Number(opportunity.budgetEfficiency)
        )
          ? Number(opportunity.budgetEfficiency)
          : Infinity;

      const ranking =
        Number.isFinite(
          Number(opportunity.rank)
        )
          ? Number(opportunity.rank)
          : index + 1;


      /*
       * Lexicographic decision key.
       *
       * The engine compares these values
       * from left to right.
       *
       * This is fundamentally different from
       * adding weighted numbers together.
       */

      const decisionKey = [

        goalAlignment,

        locationMatch,

        budgetMatch,

        preferenceMatch,

        score,

        /*
         * Lower budget efficiency is preferred.
         * Therefore the value is inverted.
         */
        Number.isFinite(budgetEfficiency)
          ? -budgetEfficiency
          : -Infinity,

        /*
         * Lower existing rank is preferred.
         */
        -ranking,

        /*
         * Stable deterministic tie breaker.
         */
        -index

      ];


      return {

        ...opportunity,

        decisionProfile: {

          goalAlignment,

          locationMatch,

          budgetMatch,

          preferenceMatch,

          score,

          budgetEfficiency,

          ranking

        },

        decisionKey

      };

    });


  // -----------------------------------------
  // 2. Compare decision keys
  // -----------------------------------------

  const compareDecisionKeys =
    (a, b) => {

      const keyA =
        a.decisionKey;

      const keyB =
        b.decisionKey;


      for (
        let i = 0;
        i < keyA.length;
        i++
      ) {

        if (keyA[i] > keyB[i]) {
          return -1;
        }

        if (keyA[i] < keyB[i]) {
          return 1;
        }

      }

      return 0;

    };


  // -----------------------------------------
  // 3. Sort candidates
  // -----------------------------------------

  const sorted =
    [...scored].sort(
      compareDecisionKeys
    );


  // -----------------------------------------
  // 4. Primary recommendation
  // -----------------------------------------

  const primary =
    sorted[0] || null;


  // -----------------------------------------
  // 5. Attach explicit decisions
  // -----------------------------------------

  const recommendations =
    sorted.map(
      (opportunity, index) => {

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
            calculateDecisionScore(
              opportunity
            ),

          decisionReasons:
            buildDecisionReasons(
              opportunity,
              context,
              isPrimary
            )

        };

      }
    );


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
 * Convert the decision profile into a
 * human-readable numerical score.
 *
 * IMPORTANT:
 * This score is for observability/debugging.
 *
 * Actual decision-making uses the
 * lexicographic decisionKey above.
 */

function calculateDecisionScore(
  opportunity
) {

  const profile =
    opportunity.decisionProfile || {};


  const goal =
    Number(profile.goalAlignment) || 0;

  const location =
    Number(profile.locationMatch) || 0;

  const budget =
    Number(profile.budgetMatch) || 0;

  const preference =
    Number(profile.preferenceMatch) || 0;

  const score =
    Number(profile.score) || 0;

  const efficiency =
    Number(profile.budgetEfficiency);


  const efficiencyPenalty =
    Number.isFinite(efficiency)
      ? efficiency * 0.1
      : 0;


  return (

    goal * 1000 +

    location * 500 +

    budget * 400 +

    preference * 300 +

    score * 10 -

    efficiencyPenalty

  );

}


/**
 * Explain why an opportunity received
 * its decision.
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
    opportunity.budgetCompatible === false
  ) {

    reasons.push(
      "Exceeds the user's stated budget"
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
    opportunity.timeCompatible === true
  ) {

    reasons.push(
      "Compatible with the user's available time"
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
