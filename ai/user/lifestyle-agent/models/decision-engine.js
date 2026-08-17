/**
 * Ride2View Lifestyle Agent
 * Decision Engine
 *
 * Purpose:
 * Converts ranked opportunities into actionable decisions.
 *
 * Pipeline:
 *
 * Discovery
 *      ↓
 * Reasoning
 *      ↓
 * Opportunity Score
 *      ↓
 * Utility Score
 *      ↓
 * Constraint Engine
 *      ↓
 * Utility Ranking
 *      ↓
 * DECISION ENGINE
 *      ↓
 * Recommendation Decision
 *
 *
 * The Decision Engine determines:
 *
 * - Whether an opportunity should be recommended
 * - Whether it should be considered an alternative
 * - Whether it should be rejected
 * - Priority level
 * - Recommended action
 * - Decision confidence
 * - Decision reason
 */


/**
 * ------------------------------------------------------------
 * UTILITIES
 * ------------------------------------------------------------
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


/**
 * ------------------------------------------------------------
 * DECISION THRESHOLDS
 * ------------------------------------------------------------
 */


/**
 * Default decision thresholds.
 *
 * These can be overridden through context.decisionConfig.
 */
const DEFAULT_THRESHOLDS = {

  primaryUtility:
    85,

  alternativeUtility:
    60,

  minimumUtility:
    40,

  primaryMatch:
    80,

  alternativeMatch:
    60,

  highPriority:
    85,

  mediumPriority:
    65,

  lowPriority:
    40

};


/**
 * Get decision configuration.
 */
function getDecisionConfig(
  context = {}
) {

  return {

    ...DEFAULT_THRESHOLDS,

    ...(context?.decisionConfig || {})

  };

}


/**
 * ------------------------------------------------------------
 * ELIGIBILITY
 * ------------------------------------------------------------
 */


/**
 * Determine whether an opportunity is eligible
 * for recommendation.
 *
 * Hard constraint failures should already be
 * represented by eligible === false.
 */
function isEligible(
  opportunity
) {

  if (
    opportunity?.eligible === false
  ) {

    return false;

  }

  if (
    opportunity?.constraintStatus ===
    "blocked"
  ) {

    return false;

  }

  return true;

}


/**
 * ------------------------------------------------------------
 * DECISION CLASSIFICATION
 * ------------------------------------------------------------
 */


/**
 * Determine the decision category.
 *
 * Possible decisions:
 *
 * primary
 * alternative
 * conditional
 * reject
 * blocked
 */
function determineDecision(
  opportunity,
  context = {}
) {

  const config =
    getDecisionConfig(
      context
    );


  const utilityScore =
    safeNumber(
      opportunity?.utilityScore,
      0
    );


  const matchPercentage =
    safeNumber(
      opportunity?.matchPercentage,
      0
    );


  /*
   * Hard constraint failure.
   */

  if (
    !isEligible(
      opportunity
    )
  ) {

    return "blocked";

  }


  /*
   * Strong utility + strong match.
   *
   * This is a primary recommendation.
   */

  if (
    utilityScore >=
      config.primaryUtility &&

    matchPercentage >=
      config.primaryMatch
  ) {

    return "primary";

  }


  /*
   * Strong utility but weaker match.
   *
   * Useful when the opportunity has high practical
   * value but doesn't perfectly match the original request.
   */

  if (
    utilityScore >=
      config.primaryUtility
  ) {

    return "alternative";

  }


  /*
   * Good enough for an alternative.
   */

  if (
    utilityScore >=
      config.alternativeUtility &&

    matchPercentage >=
      config.alternativeMatch
  ) {

    return "alternative";

  }


  /*
   * Moderate utility.
   *
   * The system may still surface this opportunity,
   * but it should not present it as a strong recommendation.
   */

  if (
    utilityScore >=
    config.minimumUtility
  ) {

    return "conditional";

  }


  /*
   * Insufficient utility.
   */

  return "reject";

}


/**
 * ------------------------------------------------------------
 * PRIORITY
 * ------------------------------------------------------------
 */


/**
 * Determine recommendation priority.
 *
 * Possible values:
 *
 * critical
 * high
 * medium
 * low
 * none
 */
function determinePriority(
  opportunity,
  decision,
  context = {}
) {

  const config =
    getDecisionConfig(
      context
    );


  const utilityScore =
    safeNumber(
      opportunity?.utilityScore,
      0
    );


  const matchPercentage =
    safeNumber(
      opportunity?.matchPercentage,
      0
    );


  /*
   * Blocked or rejected opportunities
   * do not receive recommendation priority.
   */

  if (
    decision === "blocked" ||
    decision === "reject"
  ) {

    return "none";

  }


  /*
   * Primary recommendation with
   * exceptional utility.
   */

  if (
    decision === "primary" &&
    utilityScore >= 95 &&
    matchPercentage >= 90
  ) {

    return "critical";

  }


  /*
   * High priority.
   */

  if (
    decision === "primary" &&
    utilityScore >=
      config.highPriority
  ) {

    return "high";

  }


  /*
   * Medium priority.
   */

  if (
    utilityScore >=
    config.mediumPriority
  ) {

    return "medium";

  }


  /*
   * Low priority.
   */

  return "low";

}


/**
 * ------------------------------------------------------------
 * ACTION SELECTION
 * ------------------------------------------------------------
 */


/**
 * Determine what the user should do next.
 *
 * Ride2View actions are intentionally
 * domain-oriented.
 */
function determineRecommendedAction(
  opportunity,
  decision
) {

  const type =
    normalize(
      opportunity?.type
    );

  const category =
    normalize(
      opportunity?.category
    );

  const service =
    normalize(
      opportunity?.service
    );


  /*
   * Blocked / rejected opportunities
   * should not trigger an action.
   */

  if (
    decision === "blocked" ||
    decision === "reject"
  ) {

    return "none";

  }


  /*
   * PROPERTY
   */

  if (
    type === "property" ||
    category === "property" ||
    service.includes(
      "property"
    )
  ) {

    return "view-property";

  }


  /*
   * MOBILITY
   */

  if (
    type === "mobility" ||
    category === "mobility" ||
    service.includes(
      "ride"
    ) ||
    service.includes(
      "transport"
    )
  ) {

    return "book-ride";

  }


  /*
   * FOOD
   */

  if (
    type === "food" ||
    category === "food" ||
    service.includes(
      "food"
    ) ||
    service.includes(
      "delivery"
    )
  ) {

    return "order-food";

  }


  /*
   * EVENT
   */

  if (
    type === "event" ||
    category === "event" ||
    service.includes(
      "event"
    )
  ) {

    return "view-event";

  }


  /*
   * CARGO / LOGISTICS
   */

  if (
    type === "cargo" ||
    category === "cargo" ||
    service.includes(
      "cargo"
    ) ||
    service.includes(
      "logistics"
    )
  ) {

    return "book-cargo";

  }


  /*
   * SHORT STAY
   */

  if (
    type === "short-stay" ||
    category === "short-stay" ||
    category === "accommodation"
  ) {

    return "view-accommodation";

  }


  /*
   * GENERAL FALLBACK
   */

  return "view-opportunity";

}


/**
 * ------------------------------------------------------------
 * DECISION REASON
 * ------------------------------------------------------------
 */


/**
 * Build a human-readable explanation
 * for the decision.
 */
function buildDecisionReason(
  opportunity,
  decision
) {

  const utilityScore =
    safeNumber(
      opportunity?.utilityScore,
      0
    );


  const matchPercentage =
    safeNumber(
      opportunity?.matchPercentage,
      0
    );


  const utilityLevel =
    normalize(
      opportunity?.utilityLevel
    );


  /*
   * BLOCKED
   */

  if (
    decision === "blocked"
  ) {

    return (
      "Opportunity is blocked by one or more hard constraints."
    );

  }


  /*
   * PRIMARY
   */

  if (
    decision === "primary"
  ) {

    return (
      `Strong recommendation with ${utilityScore}% utility and ` +
      `${matchPercentage}% match.`
    );

  }


  /*
   * ALTERNATIVE
   */

  if (
    decision === "alternative"
  ) {

    return (
      `Good alternative with ${utilityScore}% utility and ` +
      `${matchPercentage}% match.`
    );

  }


  /*
   * CONDITIONAL
   */

  if (
    decision === "conditional"
  ) {

    return (
      `Conditional option with ${utilityScore}% utility. ` +
      `Consider it if stronger options are unavailable.`
    );

  }


  /*
   * REJECT
   */

  if (
    decision === "reject"
  ) {

    return (
      `Utility is too low (${utilityScore}%) ` +
      `for a meaningful recommendation.`
    );

  }


  /*
   * FALLBACK
   */

  return (
    `Decision generated with ${utilityLevel || "unknown"} utility.`
  );

}


/**
 * ------------------------------------------------------------
 * CONFIDENCE
 * ------------------------------------------------------------
 */


/**
 * Calculate decision confidence.
 *
 * Confidence is not the same as utility.
 *
 * Utility = how useful the opportunity is.
 *
 * Confidence = how strongly the available evidence
 * supports the decision.
 */
function calculateDecisionConfidence(
  opportunity,
  decision
) {

  const utilityScore =
    safeNumber(
      opportunity?.utilityScore,
      0
    );


  const matchPercentage =
    safeNumber(
      opportunity?.matchPercentage,
      0
    );


  const reasoningScore =
    safeNumber(
      opportunity?.reasoningScore,
      0
    );


  /*
   * Start with utility.
   */

  let confidence =
    utilityScore * 0.45;


  /*
   * Match quality.
   */

  confidence +=
    matchPercentage * 0.30;


  /*
   * Reasoning evidence.
   *
   * Reasoning scores in the current
   * Lifestyle Agent are generally on a 0-100 scale.
   */

  confidence +=
    reasoningScore * 0.25;


  /*
   * Penalize blocked decisions.
   */

  if (
    decision === "blocked"
  ) {

    confidence =
      Math.max(
        confidence,
        90
      );

  }


  /*
   * Rejected opportunities can still have
   * high confidence in the rejection.
   */

  if (
    decision === "reject"
  ) {

    confidence =
      Math.max(
        confidence,
        70
      );

  }


  return Number(
    clamp(
      confidence,
      0,
      100
    )
      .toFixed(2)
  );

}


/**
 * ------------------------------------------------------------
 * DECISION OBJECT
 * ------------------------------------------------------------
 */


/**
 * Build the complete decision object.
 */
function buildDecision(
  opportunity,
  context = {}
) {

  const decision =
    determineDecision(
      opportunity,
      context
    );


  const priority =
    determinePriority(
      opportunity,
      decision,
      context
    );


  const recommendedAction =
    determineRecommendedAction(
      opportunity,
      decision
    );


  const reason =
    buildDecisionReason(
      opportunity,
      decision
    );


  const confidence =
    calculateDecisionConfidence(
      opportunity,
      decision
    );


  return {

    decision,

    priority,

    recommendedAction,

    confidence,

    reason

  };

}


/**
 * ------------------------------------------------------------
 * SCORE ONE OPPORTUNITY
 * ------------------------------------------------------------
 */


/**
 * Apply decision intelligence to one opportunity.
 */
function decide(
  opportunity,
  context = {}
) {

  if (
    !opportunity ||
    typeof opportunity !== "object"
  ) {

    return null;

  }


  const decision =
    buildDecision(
      opportunity,
      context
    );


  return {

    ...opportunity,

    decision:
      decision.decision,

    priority:
      decision.priority,

    decisionConfidence:
      decision.confidence,

    decisionReason:
      decision.reason,

    recommendedAction:
      decision.recommendedAction

  };

}


/**
 * ------------------------------------------------------------
 * DECIDE MANY
 * ------------------------------------------------------------
 */


/**
 * Apply the decision engine to
 * an array of opportunities.
 */
function decideAll(
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


  return opportunities.map(
    opportunity =>
      decide(
        opportunity,
        context
      )
  );

}


/**
 * ------------------------------------------------------------
 * SELECT PRIMARY
 * ------------------------------------------------------------
 */


/**
 * Select the strongest primary recommendation.
 *
 * Only eligible primary decisions are considered.
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


  const primaryCandidates =
    opportunities.filter(
      opportunity =>

        opportunity?.decision ===
          "primary" &&

        opportunity?.eligible !== false

    );


  if (
    primaryCandidates.length === 0
  ) {

    return null;

  }


  return [
    ...primaryCandidates
  ]
    .sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b.utilityScore,
          0
        ) -
        safeNumber(
          a.utilityScore,
          0
        )
    )[0];

}


/**
 * ------------------------------------------------------------
 * SELECT ALTERNATIVES
 * ------------------------------------------------------------
 */


/**
 * Select alternative recommendations.
 */
function selectAlternatives(
  opportunities,
  limit = 4
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return [];

  }


  const alternatives =
    opportunities.filter(
      opportunity =>

        (
          opportunity?.decision ===
            "alternative" ||

          opportunity?.decision ===
            "conditional"
        ) &&

        opportunity?.eligible !== false

    );


  return [
    ...alternatives
  ]
    .sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b.utilityScore,
          0
        ) -
        safeNumber(
          a.utilityScore,
          0
        )
    )
    .slice(
      0,
      Math.max(
        0,
        limit
      )
    );

}


/**
 * ------------------------------------------------------------
 * DECISION SUMMARY
 * ------------------------------------------------------------
 */


/**
 * Produce a summary of decision outcomes.
 */
function buildDecisionSummary(
  opportunities
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return {

      total: 0,

      primary: 0,

      alternatives: 0,

      conditional: 0,

      rejected: 0,

      blocked: 0

    };

  }


  return {

    total:
      opportunities.length,

    primary:
      opportunities.filter(
        opportunity =>
          opportunity?.decision ===
          "primary"
      ).length,

    alternatives:
      opportunities.filter(
        opportunity =>
          opportunity?.decision ===
          "alternative"
      ).length,

    conditional:
      opportunities.filter(
        opportunity =>
          opportunity?.decision ===
          "conditional"
      ).length,

    rejected:
      opportunities.filter(
        opportunity =>
          opportunity?.decision ===
          "reject"
      ).length,

    blocked:
      opportunities.filter(
        opportunity =>
          opportunity?.decision ===
          "blocked"
      ).length

  };

}


/**
 * ------------------------------------------------------------
 * COMPLETE DECISION PIPELINE
 * ------------------------------------------------------------
 */


/**
 * Run the decision engine over ranked opportunities.
 *
 * This is the primary function that the
 * Lifestyle Recommendation workflow should call.
 */
function runDecisionEngine(
  opportunities,
  context = {}
) {

  const decided =
    decideAll(
      opportunities,
      context
    );


  const primary =
    selectPrimary(
      decided
    );


  const alternatives =
    selectAlternatives(
      decided,
      context?.alternativeLimit || 4
    );


  const summary =
    buildDecisionSummary(
      decided
    );


  return {

    opportunities:
      decided,

    primary,

    alternatives,

    summary

  };

}


/**
 * ------------------------------------------------------------
 * PUBLIC API
 * ------------------------------------------------------------
 */

module.exports = {

  /*
   * Main decision functions.
   */

  runDecisionEngine,

  decide,

  decideAll,


  /*
   * Decision classification.
   */

  determineDecision,

  determinePriority,

  determineRecommendedAction,


  /*
   * Explanation and confidence.
   */

  buildDecisionReason,

  calculateDecisionConfidence,

  buildDecision,


  /*
   * Selection.
   */

  selectPrimary,

  selectAlternatives,


  /*
   * Summary.
   */

  buildDecisionSummary,


  /*
   * Eligibility/configuration.
   */

  isEligible,

  getDecisionConfig

};
