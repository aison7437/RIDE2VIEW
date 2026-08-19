/**
 * Ride2View Lifestyle Agent
 * Opportunity Scoring & Ranking Model
 *
 * Responsibilities:
 *
 * 1. Calculate budget efficiency
 * 2. Calculate match percentage
 * 3. Calculate opportunity score
 * 4. Calculate Lifestyle Utility
 * 5. Attach utility intelligence
 * 6. Rank opportunities deterministically
 *
 * Ranking hierarchy:
 *
 * 1. Overall score          DESC
 * 2. Match percentage       DESC
 * 3. Budget efficiency      ASC
 * 4. Opportunity ID         ASC
 *
 * Lifestyle Utility is currently an intelligence signal.
 * It does NOT override the existing ranking hierarchy.
 */

const {
  calculateLifestyleUtility
} = require("./lifestyle-utility");


/* =========================================================
   HELPERS
========================================================= */

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/* =========================================================
   BUDGET EFFICIENCY
========================================================= */

/**
 * Calculate budget efficiency.
 *
 * Example:
 *
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

  const budget = toFiniteNumber(
    opportunity.budget ??
    context?.budget,
    NaN
  );

  const price = toFiniteNumber(
    opportunity.price,
    NaN
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


/* =========================================================
   MATCH PERCENTAGE
========================================================= */

/**
 * Calculate match percentage from compatibility signals.
 *
 * Existing valid matchPercentage values are preserved.
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
      signal =>
        typeof signal === "boolean"
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


/* =========================================================
   OPPORTUNITY SCORE
========================================================= */

/**
 * Calculate the existing overall opportunity score.
 *
 * Reasoning score is used as the foundation.
 *
 * Contextual compatibility then contributes additional
 * deterministic scoring signals.
 */

function calculateOpportunityScore(
  opportunity = {},
  context = {}
) {

  const reasoningScore =
    toFiniteNumber(
      opportunity.reasoningScore,
      0
    );

  let score =
    reasoningScore;


  /* -------------------------------------------------------
     LOCATION
  ------------------------------------------------------- */

  if (
    opportunity.locationMatch === true
  ) {
    score += 15;
  }


  /* -------------------------------------------------------
     BUDGET
  ------------------------------------------------------- */

  if (
    opportunity.budgetCompatible === true
  ) {
    score += 15;
  }


  /* -------------------------------------------------------
     TIME
  ------------------------------------------------------- */

  if (
    opportunity.timeCompatible === true
  ) {
    score += 10;
  }


  /* -------------------------------------------------------
     PREFERENCE
  ------------------------------------------------------- */

  if (
    opportunity.preferenceMatch === true
  ) {
    score += 10;
  }


  /* -------------------------------------------------------
     PRESERVE EXISTING VALID SCORE
  ------------------------------------------------------- */

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


/* =========================================================
   SCORE OPPORTUNITY
========================================================= */

/**
 * Score a single opportunity.
 *
 * This function produces the complete scoring object used
 * by the ranking stage.
 */

function scoreOpportunity(
  opportunity = {},
  context = {}
) {

  const safeOpportunity =
    opportunity &&
    typeof opportunity === "object"
      ? opportunity
      : {};


  /* -------------------------------------------------------
     1. EXISTING OPPORTUNITY SCORE
  ------------------------------------------------------- */

  const score =
    calculateOpportunityScore(
      safeOpportunity,
      context
    );


  /* -------------------------------------------------------
     2. MATCH PERCENTAGE
  ------------------------------------------------------- */

  const matchPercentage =
    calculateMatchPercentage(
      safeOpportunity
    );


  /* -------------------------------------------------------
     3. BUDGET EFFICIENCY
  ------------------------------------------------------- */

  const budgetEfficiency =
    calculateBudgetEfficiency(
      safeOpportunity,
      context
    );


  /* -------------------------------------------------------
     4. LIFESTYLE UTILITY
  ------------------------------------------------------- */

  let lifestyleUtility = {
    utilityScore: 0,
    utilityLevel: "low",
    factors: [],
    explanation: "No utility assessment available."
  };

  try {

    const utilityResult =
      calculateLifestyleUtility(
        {
          ...safeOpportunity,

          score,
          matchPercentage,
          budgetEfficiency
        },
        context
      );

    if (
      utilityResult &&
      typeof utilityResult === "object"
    ) {
      lifestyleUtility = {
        utilityScore:
          toFiniteNumber(
            utilityResult.utilityScore,
            0
          ),

        utilityLevel:
          utilityResult.utilityLevel ||
          "low",

        factors:
          Array.isArray(
            utilityResult.factors
          )
            ? utilityResult.factors
            : [],

        explanation:
          utilityResult.explanation ||
          "No utility explanation available."
      };
    }

  } catch (error) {

    /*
     * Utility failure must not destroy the
     * core recommendation pipeline.
     */

    lifestyleUtility = {
      utilityScore: 0,
      utilityLevel: "low",
      factors: [],
      explanation:
        "Lifestyle utility calculation unavailable."
    };
  }


  /* -------------------------------------------------------
     5. RETURN ENRICHED OPPORTUNITY
  ------------------------------------------------------- */

  return {

    ...safeOpportunity,

    score,

    matchPercentage,

    budgetEfficiency,

    utilityScore:
      lifestyleUtility.utilityScore,

    utilityLevel:
      lifestyleUtility.utilityLevel,

    utilityFactors:
      lifestyleUtility.factors,

    utilityExplanation:
      lifestyleUtility.explanation

  };
}


/* =========================================================
   RANK OPPORTUNITIES
========================================================= */

/**
 * Rank opportunities deterministically.
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
 *
 * Lifestyle Utility is intentionally NOT used as a
 * ranking criterion yet.
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


  /* -------------------------------------------------------
     1. SCORE ALL OPPORTUNITIES
  ------------------------------------------------------- */

  const scored =
    opportunities.map(
      opportunity =>
        scoreOpportunity(
          opportunity,
          context
        )
    );


  /* -------------------------------------------------------
     2. DETERMINISTIC SORT
  ------------------------------------------------------- */

  scored.sort(
    (a, b) => {

      /* -----------------------------------------------
         SCORE — HIGHER FIRST
      ----------------------------------------------- */

      const scoreA =
        toFiniteNumber(
          a.score,
          0
        );

      const scoreB =
        toFiniteNumber(
          b.score,
          0
        );

      if (
        scoreA !== scoreB
      ) {
        return (
          scoreB -
          scoreA
        );
      }


      /* -----------------------------------------------
         MATCH PERCENTAGE — HIGHER FIRST
      ----------------------------------------------- */

      const matchA =
        toFiniteNumber(
          a.matchPercentage,
          0
        );

      const matchB =
        toFiniteNumber(
          b.matchPercentage,
          0
        );

      if (
        matchA !== matchB
      ) {
        return (
          matchB -
          matchA
        );
      }


      /* -----------------------------------------------
         BUDGET EFFICIENCY — LOWER FIRST
      ----------------------------------------------- */

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


      /* -----------------------------------------------
         OPPORTUNITY ID — ASCENDING
      ----------------------------------------------- */

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


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  calculateBudgetEfficiency,

  calculateMatchPercentage,

  calculateOpportunityScore,

  scoreOpportunity,

  rankOpportunities

};
