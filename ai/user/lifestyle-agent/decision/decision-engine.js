/**
 * Ride2View Lifestyle Agent
 * Decision Engine
 *
 * Purpose:
 * Determines what the Lifestyle Agent should recommend
 * after opportunity scoring, utility scoring, ranking,
 * and constraint evaluation.
 *
 * Pipeline:
 *
 * Discovery
 *     ↓
 * Reasoning
 *     ↓
 * Opportunity Scoring
 *     ↓
 * Utility Scoring
 *     ↓
 * Constraint Evaluation
 *     ↓
 * Utility Ranking
 *     ↓
 * DECISION ENGINE
 *     ↓
 * Recommendation Formatter
 *
 *
 * Decision Engine responsibilities:
 *
 * 1. Determine eligibility
 * 2. Determine recommendation strength
 * 3. Identify primary recommendation
 * 4. Identify alternatives
 * 5. Determine recommended action
 * 6. Explain the decision
 * 7. Detect when the user should refine the search
 * 8. Prevent blocked opportunities from becoming
 *    primary recommendations
 */


/* ============================================================
 * UTILITY HELPERS
 * ============================================================
 */


/**
 * Safely convert a value to a number.
 */
function safeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

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
      safeNumber(
        value,
        minimum
      ),
      minimum
    ),
    maximum
  );

}


/**
 * Normalize text.
 */
function normalize(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


/* ============================================================
 * ELIGIBILITY
 * ============================================================
 */


/**
 * Determine whether an opportunity is eligible.
 *
 * Explicit eligibility always takes precedence.
 */
function isEligible(
  opportunity
) {

  if (
    !opportunity
  ) {

    return false;

  }


  if (
    opportunity.eligible === false
  ) {

    return false;

  }


  if (
    opportunity.constraintStatus ===
    "blocked"
  ) {

    return false;

  }


  if (
    opportunity.available === false
  ) {

    return false;

  }


  if (
    opportunity.isAvailable === false
  ) {

    return false;

  }


  if (
    normalize(
      opportunity.availability
    ) === "unavailable"
  ) {

    return false;

  }


  return true;

}


/**
 * Determine whether an opportunity is blocked.
 */
function isBlocked(
  opportunity
) {

  if (
    !opportunity
  ) {

    return true;

  }


  if (
    opportunity.eligible === false
  ) {

    return true;

  }


  if (
    opportunity.constraintStatus ===
    "blocked"
  ) {

    return true;

  }


  return false;

}


/* ============================================================
 * SCORE INTERPRETATION
 * ============================================================
 */


/**
 * Get utility score.
 */
function getUtilityScore(
  opportunity
) {

  return clamp(
    opportunity?.utilityScore ??
    opportunity?.score ??
    0
  );

}


/**
 * Get match percentage.
 */
function getMatchPercentage(
  opportunity
) {

  return clamp(
    opportunity?.matchPercentage ??
    0
  );

}


/**
 * Determine recommendation strength.
 *
 * excellent:
 *   utility >= 90
 *
 * strong:
 *   utility >= 80
 *
 * good:
 *   utility >= 70
 *
 * moderate:
 *   utility >= 60
 *
 * weak:
 *   utility >= 40
 *
 * poor:
 *   below 40
 */
function determineRecommendationStrength(
  opportunity
) {

  if (
    !isEligible(
      opportunity
    )
  ) {

    return "blocked";

  }


  const utilityScore =
    getUtilityScore(
      opportunity
    );


  const matchPercentage =
    getMatchPercentage(
      opportunity
    );


  if (
    utilityScore >= 90 &&
    matchPercentage >= 90
  ) {

    return "excellent";

  }


  if (
    utilityScore >= 80 &&
    matchPercentage >= 80
  ) {

    return "strong";

  }


  if (
    utilityScore >= 70 &&
    matchPercentage >= 70
  ) {

    return "good";

  }


  if (
    utilityScore >= 60
  ) {

    return "moderate";

  }


  if (
    utilityScore >= 40
  ) {

    return "weak";

  }


  return "poor";

}


/* ============================================================
 * ACTION ENGINE
 * ============================================================
 */


/**
 * Determine the action the user should take.
 */
function determineAction(
  opportunity
) {

  if (
    !opportunity
  ) {

    return "refine-search";

  }


  if (
    isBlocked(
      opportunity
    )
  ) {

    return "refine-search";

  }


  if (
    opportunity.recommendedAction
  ) {

    return opportunity.recommendedAction;

  }


  switch (
    normalize(
      opportunity.type
    )
  ) {

    case "property":

      return "view-property";


    case "mobility":

      return "book-ride";


    case "food":

      return "order-food";


    case "marketplace":

      return "shop";


    case "event":

      return "view-event";


    default:

      return "view-opportunity";

  }

}


/**
 * Human-readable action label.
 */
function getActionLabel(
  action
) {

  const labels = {

    "view-property":
      "View property",

    "compare-property":
      "Compare properties",

    "review-property":
      "Review property",

    "book-ride":
      "Book ride",

    "order-food":
      "Order food",

    "shop":
      "Shop",

    "view-event":
      "View event",

    "review-food":
      "Review food",

    "review-marketplace":
      "Review marketplace",

    "view-opportunity":
      "View recommendation",

    "refine-search":
      "Refine your search"

  };


  return (
    labels[action] ||
    "View recommendation"
  );

}


/* ============================================================
 * DECISION EXPLANATION
 * ============================================================
 */


/**
 * Build explanation for a decision.
 */
function buildDecisionReason(
  opportunity
) {

  if (
    !opportunity
  ) {

    return (
      "No suitable opportunity was found."
    );

  }


  if (
    isBlocked(
      opportunity
    )
  ) {

    return (
      "This opportunity is blocked by " +
      "one or more constraints."
    );

  }


  const reasons = [];


  const utilityScore =
    getUtilityScore(
      opportunity
    );


  const matchPercentage =
    getMatchPercentage(
      opportunity
    );


  if (
    matchPercentage >= 90
  ) {

    reasons.push(
      "It strongly matches the user's requirements."
    );

  }
  else if (
    matchPercentage >= 75
  ) {

    reasons.push(
      "It matches most of the user's requirements."
    );

  }


  if (
    utilityScore >= 90
  ) {

    reasons.push(
      "It provides excellent overall utility."
    );

  }
  else if (
    utilityScore >= 75
  ) {

    reasons.push(
      "It provides strong overall utility."
    );

  }
  else if (
    utilityScore >= 60
  ) {

    reasons.push(
      "It provides moderate overall utility."
    );

  }


  if (
    opportunity.utilityFactors?.locationFit >= 80
  ) {

    reasons.push(
      "The location is compatible."
    );

  }


  if (
    opportunity.utilityFactors?.budgetFit >= 80
  ) {

    reasons.push(
      "The budget fit is strong."
    );

  }


  if (
    opportunity.utilityFactors?.preferenceFit >= 80
  ) {

    reasons.push(
      "It matches the user's preferences."
    );

  }


  if (
    opportunity.constraintStatus ===
    "warning"
  ) {

    reasons.push(
      "However, there are some constraint warnings to consider."
    );

  }


  if (
    reasons.length === 0
  ) {

    return (
      "This opportunity currently provides " +
      "the best available match."
    );

  }


  return reasons.join(" ");

}


/* ============================================================
 * PRIMARY RECOMMENDATION
 * ============================================================
 */


/**
 * Select the strongest eligible opportunity.
 *
 * Blocked opportunities can NEVER become primary.
 */
function selectPrimary(
  opportunities
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return null;

  }


  const eligible =
    opportunities.filter(
      opportunity =>
        isEligible(
          opportunity
        )
    );


  if (
    eligible.length === 0
  ) {

    return null;

  }


  /*
   * Prefer explicitly ranked opportunities.
   */
  const ranked =
    [...eligible]
      .sort(
        (a, b) => {

          const utilityDifference =
            getUtilityScore(b) -
            getUtilityScore(a);


          if (
            utilityDifference !== 0
          ) {

            return utilityDifference;

          }


          const matchDifference =
            getMatchPercentage(b) -
            getMatchPercentage(a);


          if (
            matchDifference !== 0
          ) {

            return matchDifference;

          }


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
      );


  return ranked[0] || null;

}


/* ============================================================
 * ALTERNATIVES
 * ============================================================
 */


/**
 * Select alternative recommendations.
 *
 * Blocked opportunities are excluded.
 */
function selectAlternatives(
  opportunities,
  primary
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return [];

  }


  return opportunities
    .filter(
      opportunity => {

        if (
          !isEligible(
            opportunity
          )
        ) {

          return false;

        }


        if (
          primary &&
          opportunity.id ===
          primary.id
        ) {

          return false;

        }


        return true;

      }
    )
    .sort(
      (a, b) =>
        getUtilityScore(b) -
        getUtilityScore(a)
    );

}


/* ============================================================
 * SEARCH QUALITY
 * ============================================================
 */


/**
 * Determine whether the search result
 * is strong enough to make a recommendation.
 */
function hasStrongRecommendation(
  opportunity
) {

  if (
    !opportunity ||
    !isEligible(
      opportunity
    )
  ) {

    return false;

  }


  const utilityScore =
    getUtilityScore(
      opportunity
    );


  const matchPercentage =
    getMatchPercentage(
      opportunity
    );


  return (
    utilityScore >= 60 ||
    matchPercentage >= 70
  );

}


/**
 * Determine whether the user should refine
 * their search.
 */
function shouldRefineSearch(
  primary,
  opportunities
) {

  if (
    !primary
  ) {

    return true;

  }


  if (
    !hasStrongRecommendation(
      primary
    )
  ) {

    return true;

  }


  const eligibleCount =
    Array.isArray(
      opportunities
    )
      ? opportunities.filter(
          opportunity =>
            isEligible(
              opportunity
            )
        ).length
      : 0;


  if (
    eligibleCount === 0
  ) {

    return true;

  }


  return false;

}


/* ============================================================
 * DECISION STATUS
 * ============================================================
 */


/**
 * Determine overall decision status.
 */
function determineDecisionStatus(
  primary,
  alternatives
) {

  if (
    !primary
  ) {

    return "no-match";

  }


  const strength =
    determineRecommendationStrength(
      primary
    );


  if (
    strength === "excellent"
  ) {

    return "recommended";

  }


  if (
    strength === "strong"
  ) {

    return "recommended";

  }


  if (
    strength === "good"
  ) {

    return "recommended";

  }


  if (
    strength === "moderate"
  ) {

    return "conditional";

  }


  if (
    Array.isArray(
      alternatives
    ) &&
    alternatives.length > 0
  ) {

    return "compare";

  }


  return "refine";

}


/* ============================================================
 * DECISION OBJECT
 * ============================================================
 */


/**
 * Build decision object for one opportunity.
 */
function buildOpportunityDecision(
  opportunity
) {

  if (
    !opportunity
  ) {

    return {

      selected: false,

      eligible: false,

      blocked: true,

      strength: "blocked",

      action: "refine-search",

      actionLabel:
        "Refine your search",

      reason:
        "No opportunity was provided."

    };

  }


  const eligible =
    isEligible(
      opportunity
    );


  const blocked =
    !eligible;


  const strength =
    determineRecommendationStrength(
      opportunity
    );


  const action =
    determineAction(
      opportunity
    );


  return {

    id:
      opportunity.id ||
      null,

    selected:
      false,

    eligible,

    blocked,

    strength,

    utilityScore:
      getUtilityScore(
        opportunity
      ),

    matchPercentage:
      getMatchPercentage(
        opportunity
      ),

    action,

    actionLabel:
      getActionLabel(
        action
      ),

    reason:
      buildDecisionReason(
        opportunity
      )

  };

}


/* ============================================================
 * MAIN DECISION ENGINE
 * ============================================================
 */


/**
 * Make final recommendation decision.
 *
 * Input:
 *
 * ranked opportunities
 *
 * Output:
 *
 * primary recommendation
 * alternatives
 * decision metadata
 * next action
 */
function makeDecision(
  opportunities = [],
  context = {}
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return {

      success: false,

      decision:
        "no-match",

      primary:
        null,

      alternatives:
        [],

      recommendations:
        [],

      nextAction: {

        action:
          "refine-search",

        label:
          "Refine your search"

      },

      reason:
        "No valid opportunity list was provided."

    };

  }


  /*
   * Remove null values.
   */
  const clean =
    opportunities.filter(
      Boolean
    );


  /*
   * Select primary recommendation.
   */
  const primary =
    selectPrimary(
      clean
    );


  /*
   * Select alternatives.
   */
  const alternatives =
    selectAlternatives(
      clean,
      primary
    );


  /*
   * Determine whether search refinement
   * is required.
   */
  const refine =
    shouldRefineSearch(
      primary,
      clean
    );


  /*
   * Determine decision status.
   */
  const decisionStatus =
    determineDecisionStatus(
      primary,
      alternatives
    );


  /*
   * Build decision metadata.
   */
  const primaryDecision =
    buildOpportunityDecision(
      primary
    );


  if (
    primary
  ) {

    primaryDecision.selected =
      true;

  }


  /*
   * Build decisions for alternatives.
   */
  const alternativeDecisions =
    alternatives.map(
      opportunity =>
        buildOpportunityDecision(
          opportunity
        )
    );


  /*
   * Build final next action.
   */
  const nextAction =
    refine
      ? {

          action:
            "refine-search",

          label:
            "Refine your search"

        }

      : {

          action:
            primaryDecision.action,

          label:
            primaryDecision.actionLabel

        };


  /*
   * Build final reason.
   */
  let reason;


  if (
    !primary
  ) {

    reason =
      "No eligible opportunity satisfies the current constraints.";

  }
  else if (
    refine
  ) {

    reason =
      "The available opportunities do not provide a sufficiently strong match. The user should refine the search.";

  }
  else {

    reason =
      buildDecisionReason(
        primary
      );

  }


  /*
   * Return decision.
   */
  return {

    success:
      true,

    agent:
      "ride2view-lifestyle-agent",

    decision:
      decisionStatus,

    refineSearch:
      refine,

    reason,

    primary:
      primary
        ? {

            ...primary,

            decision:
              primaryDecision

          }

        : null,

    alternatives:
      alternatives.map(
        (
          opportunity,
          index
        ) => ({

          ...opportunity,

          decision:
            alternativeDecisions[index]

        })
      ),

    nextAction,

    metadata: {

      totalOpportunities:
        clean.length,

      eligibleOpportunities:
        clean.filter(
          opportunity =>
            isEligible(
              opportunity
            )
        ).length,

      blockedOpportunities:
        clean.filter(
          opportunity =>
            isBlocked(
              opportunity
            )
        ).length,

      primaryUtilityScore:
        primary
          ? getUtilityScore(
              primary
            )
          : null,

      primaryMatchPercentage:
        primary
          ? getMatchPercentage(
              primary
            )
          : null,

      primaryStrength:
        primary
          ? determineRecommendationStrength(
              primary
            )
          : "none"

    },

    context: {

      goal:
        context?.userGoal ||
        context?.goal ||
        null,

      location:
        context?.location ||
        null,

      budget:
        context?.budget ??
        null,

      availableTime:
        context?.availableTime ??
        null

    }

  };

}


/* ============================================================
 * DECISION SUMMARY
 * ============================================================
 */


/**
 * Build a compact summary suitable for
 * recommendation-formatting layers.
 */
function buildDecisionSummary(
  decisionResult
) {

  if (
    !decisionResult
  ) {

    return {

      status:
        "no-match",

      hasPrimary:
        false,

      alternativeCount:
        0,

      nextAction:
        "refine-search"

    };

  }


  return {

    status:
      decisionResult.decision ||
      "no-match",

    hasPrimary:
      Boolean(
        decisionResult.primary
      ),

    primaryId:
      decisionResult.primary?.id ||
      null,

    primaryStrength:
      decisionResult.metadata
        ?.primaryStrength ||
      "none",

    primaryUtilityScore:
      decisionResult.metadata
        ?.primaryUtilityScore ??
      null,

    primaryMatchPercentage:
      decisionResult.metadata
        ?.primaryMatchPercentage ??
      null,

    alternativeCount:
      Array.isArray(
        decisionResult.alternatives
      )
        ? decisionResult.alternatives.length
        : 0,

    blockedCount:
      decisionResult.metadata
        ?.blockedOpportunities ||
      0,

    eligibleCount:
      decisionResult.metadata
        ?.eligibleOpportunities ||
      0,

    refineSearch:
      decisionResult.refineSearch === true,

    nextAction:
      decisionResult.nextAction
        ?.action ||
      "refine-search"

  };

}


/* ============================================================
 * PUBLIC API
 * ============================================================
 */

module.exports = {

  /*
   * Main decision engine.
   */
  makeDecision,

  /*
   * Primary / alternatives.
   */
  selectPrimary,

  selectAlternatives,

  /*
   * Eligibility.
   */
  isEligible,

  isBlocked,

  /*
   * Recommendation strength.
   */
  determineRecommendationStrength,

  /*
   * Actions.
   */
  determineAction,

  getActionLabel,

  /*
   * Decision reasoning.
   */
  buildDecisionReason,

  /*
   * Search quality.
   */
  hasStrongRecommendation,

  shouldRefineSearch,

  /*
   * Decision status.
   */
  determineDecisionStatus,

  /*
   * Individual decision.
   */
  buildOpportunityDecision,

  /*
   * Summary.
   */
  buildDecisionSummary

};
