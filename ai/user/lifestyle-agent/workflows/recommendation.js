/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Responsibility:
 *
 * Converts ranked utility opportunities into
 * actionable recommendations.
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
 * Decision Engine
 *     ↓
 * Recommendation Selection
 *     ↓
 * Primary + Alternatives
 *     ↓
 * Action
 *
 * The recommendation layer should NOT perform
 * deep scoring itself.
 *
 * It consumes:
 *
 * - utilityScore
 * - utilityLevel
 * - eligibility
 * - constraintStatus
 * - reasoningScore
 * - opportunity score
 * - matchPercentage
 *
 * and delegates the final decision to
 * decision-engine.js.
 */


/* ============================================================
 * DEPENDENCIES
 * ============================================================
 */

const {
  rankByUtility
} = require("../models/utility-scoring");

const {
  makeDecision,
  decideRecommendation,
  evaluateDecision
} = require("../models/decision-engine");


/* ============================================================
 * SAFE HELPERS
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
 * Clamp a value.
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
 * DECISION ENGINE ADAPTER
 * ============================================================
 *
 * The adapter makes recommendation.js resilient to
 * small changes in decision-engine.js.
 *
 * If the engine exposes:
 *
 * makeDecision()
 * decideRecommendation()
 * evaluateDecision()
 *
 * this layer will use whichever function exists.
 *
 * This keeps the workflow modular.
 */


/**
 * Execute decision engine.
 */
function runDecisionEngine(
  opportunity,
  context = {}
) {

  const decisionContext = {

    opportunity,

    context,

    utilityScore:
      safeNumber(
        opportunity?.utilityScore,
        0
      ),

    utilityLevel:
      opportunity?.utilityLevel ||
      "poor",

    eligible:
      opportunity?.eligible !== false,

    constraintStatus:
      opportunity?.constraintStatus ||
      "clear",

    constraintPenalty:
      safeNumber(
        opportunity?.constraintPenalty,
        0
      ),

    reasoningScore:
      safeNumber(
        opportunity?.reasoningScore,
        0
      ),

    opportunityScore:
      safeNumber(
        opportunity?.score,
        0
      ),

    matchPercentage:
      safeNumber(
        opportunity?.matchPercentage,
        0
      )

  };


  /*
   * Preferred API.
   */

  if (
    typeof makeDecision ===
    "function"
  ) {

    return normalizeDecision(
      makeDecision(
        opportunity,
        context,
        decisionContext
      )
    );

  }


  /*
   * Alternative API.
   */

  if (
    typeof decideRecommendation ===
    "function"
  ) {

    return normalizeDecision(
      decideRecommendation(
        opportunity,
        context,
        decisionContext
      )
    );

  }


  /*
   * Alternative API.
   */

  if (
    typeof evaluateDecision ===
    "function"
  ) {

    return normalizeDecision(
      evaluateDecision(
        opportunity,
        context,
        decisionContext
      )
    );

  }


  /*
   * Safe fallback.
   *
   * This prevents the recommendation workflow
   * from crashing if the decision engine does
   * not expose one of the expected functions.
   */

  return fallbackDecision(
    opportunity
  );

}


/* ============================================================
 * DECISION NORMALIZATION
 * ============================================================
 */


/**
 * Normalize different decision-engine
 * response structures into one schema.
 */
function normalizeDecision(
  decision
) {

  if (
    !decision ||
    typeof decision !== "object"
  ) {

    return fallbackDecision(
      {}
    );

  }


  const action =
    normalize(
      decision.action ||
      decision.decision ||
      decision.outcome
    );


  let normalizedAction =
    action;


  /*
   * Normalize common decision names.
   */

  if (
    action === "recommend" ||
    action === "recommended" ||
    action === "select"
  ) {

    normalizedAction =
      "recommend";

  }
  else if (
    action === "alternative" ||
    action === "offer-alternative"
  ) {

    normalizedAction =
      "alternative";

  }
  else if (
    action === "defer" ||
    action === "deferred"
  ) {

    normalizedAction =
      "defer";

  }
  else if (
    action === "reject" ||
    action === "rejected" ||
    action === "block"
  ) {

    normalizedAction =
      "reject";

  }


  return {

    ...decision,

    decision:
      normalizedAction ||
      "alternative",

    action:
      normalizedAction ||
      "alternative",

    priority:
      decision.priority ||
      "normal",

    confidence:
      clamp(
        decision.confidence,
        0,
        100
      ),

    reason:
      decision.reason ||
      decision.explanation ||
      "Decision generated by the lifestyle decision engine."

  };

}


/**
 * Safe fallback decision.
 */
function fallbackDecision(
  opportunity
) {

  const utilityScore =
    safeNumber(
      opportunity?.utilityScore,
      0
    );

  const eligible =
    opportunity?.eligible !== false;


  if (
    !eligible
  ) {

    return {

      decision:
        "reject",

      action:
        "reject",

      priority:
        "none",

      confidence:
        100,

      reason:
        "Opportunity is not eligible."

    };

  }


  if (
    utilityScore >= 90
  ) {

    return {

      decision:
        "recommend",

      action:
        "recommend",

      priority:
        "high",

      confidence:
        utilityScore,

      reason:
        "Opportunity has excellent utility."

    };

  }


  if (
    utilityScore >= 75
  ) {

    return {

      decision:
        "alternative",

      action:
        "alternative",

      priority:
        "normal",

      confidence:
        utilityScore,

      reason:
        "Opportunity is a strong alternative."

    };

  }


  return {

    decision:
      "alternative",

    action:
      "alternative",

    priority:
      "low",

    confidence:
      utilityScore,

    reason:
      "Opportunity may be useful as a lower-priority alternative."

  };

}


/* ============================================================
 * RECOMMENDATION REASONING
 * ============================================================
 */


/**
 * Build a human-readable recommendation reason.
 */
function buildRecommendationReason(
  opportunity,
  decision,
  context = {}
) {

  const reasons = [];


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
   * Goal alignment.
   */

  if (
    utilityScore >= 90
  ) {

    reasons.push(
      "It provides excellent overall utility for your request."
    );

  }
  else if (
    utilityScore >= 75
  ) {

    reasons.push(
      "It provides strong overall utility for your request."
    );

  }
  else if (
    utilityScore >= 60
  ) {

    reasons.push(
      "It provides reasonable utility for your request."
    );

  }


  /*
   * Match.
   */

  if (
    matchPercentage >= 90
  ) {

    reasons.push(
      "It closely matches your stated requirements."
    );

  }
  else if (
    matchPercentage >= 70
  ) {

    reasons.push(
      "It matches most of your stated requirements."
    );

  }


  /*
   * Location.
   */

  if (
    opportunity?.utilityFactors?.locationFit >= 80
  ) {

    reasons.push(
      "The location is strongly compatible."
    );

  }


  /*
   * Budget.
   */

  if (
    opportunity?.utilityFactors?.budgetFit >= 80
  ) {

    reasons.push(
      "It fits the stated budget well."
    );

  }
  else if (
    opportunity?.utilityFactors?.budgetFit >= 50
  ) {

    reasons.push(
      "It is reasonably compatible with the budget."
    );

  }


  /*
   * Preferences.
   */

  if (
    opportunity?.utilityFactors?.preferenceFit >= 80
  ) {

    reasons.push(
      "It matches the user's preferences."
    );

  }


  /*
   * Decision engine reason.
   */

  if (
    decision?.reason
  ) {

    reasons.push(
      decision.reason
    );

  }


  /*
   * Remove duplicates.
   */

  return [
    ...new Set(
      reasons
    )
  ].join(" ");

}


/* ============================================================
 * ACTION MAPPING
 * ============================================================
 */


/**
 * Determine the next action.
 */
function determineRecommendedAction(
  opportunity
) {

  const type =
    normalize(
      opportunity?.type
    );

  const service =
    normalize(
      opportunity?.service
    );


  /*
   * Property.
   */

  if (
    type === "property" ||
    service.includes(
      "property"
    )
  ) {

    return {

      action:
        "view-property",

      label:
        "View property"

    };

  }


  /*
   * Mobility.
   */

  if (
    type === "mobility" ||
    service === "ride"
  ) {

    return {

      action:
        "book-ride",

      label:
        "Book ride"

    };

  }


  /*
   * Food.
   */

  if (
    type === "food" ||
    service.includes(
      "food"
    )
  ) {

    return {

      action:
        "order-food",

      label:
        "Order food"

    };

  }


  /*
   * Event.
   */

  if (
    type === "event" ||
    service.includes(
      "event"
    )
  ) {

    return {

      action:
        "view-event",

      label:
        "View event"

    };

  }


  /*
   * Generic fallback.
   */

  return {

    action:
      "view-opportunity",

    label:
      "View opportunity"

  };

}


/* ============================================================
 * PREPARE ONE RECOMMENDATION
 * ============================================================
 */


/**
 * Convert an opportunity into the
 * public recommendation schema.
 */
function prepareRecommendation(
  opportunity,
  context = {},
  rank = 1
) {

  const decision =
    runDecisionEngine(
      opportunity,
      context
    );


  const action =
    determineRecommendedAction(
      opportunity
    );


  const reason =
    buildRecommendationReason(
      opportunity,
      decision,
      context
    );


  return {

    /*
     * Identity.
     */

    id:
      opportunity?.id,

    type:
      opportunity?.type,

    category:
      opportunity?.category,

    service:
      opportunity?.service,

    title:
      opportunity?.title ||
      "Recommended opportunity",

    description:
      opportunity?.description ||
      "",


    /*
     * Recommendation reasoning.
     */

    reason,

    recommendation:
      opportunity?.recommendation ||
      "",


    /*
     * Location and pricing.
     */

    location:
      opportunity?.location ||
      null,

    price:
      opportunity?.price ??
      null,

    budget:
      opportunity?.budget ??
      null,

    availableTime:
      opportunity?.availableTime ??
      null,

    availability:
      opportunity?.availability ??
      null,


    /*
     * Domain-specific information.
     */

    property:
      opportunity?.property ||
      null,


    /*
     * Existing intelligence.
     */

    relevance:
      opportunity?.relevance,

    locationMatch:
      opportunity?.locationMatch,

    budgetCompatible:
      opportunity?.budgetCompatible,

    timeCompatible:
      opportunity?.timeCompatible,

    preferenceMatch:
      opportunity?.preferenceMatch,


    /*
     * Scores.
     */

    score:
      safeNumber(
        opportunity?.score,
        0
      ),

    matchPercentage:
      safeNumber(
        opportunity?.matchPercentage,
        0
      ),

    reasoningScore:
      safeNumber(
        opportunity?.reasoningScore,
        0
      ),

    utilityScore:
      safeNumber(
        opportunity?.utilityScore,
        0
      ),

    utilityLevel:
      opportunity?.utilityLevel ||
      "poor",


    /*
     * Utility intelligence.
     */

    utilityFactors:
      opportunity?.utilityFactors ||
      {},

    utilityExplanation:
      opportunity?.utilityExplanation ||
      [],

    baseUtilityScore:
      opportunity?.baseUtilityScore ??
      null,


    /*
     * Constraint intelligence.
     */

    eligible:
      opportunity?.eligible !== false,

    constraintStatus:
      opportunity?.constraintStatus ||
      "clear",

    constraintPenalty:
      safeNumber(
        opportunity?.constraintPenalty,
        0
      ),

    constraintViolations:
      opportunity?.constraintViolations ||
      [],

    constraintWarnings:
      opportunity?.constraintWarnings ||
      [],


    /*
     * DECISION ENGINE OUTPUT.
     */

    decision:
      decision.decision,

    decisionAction:
      decision.action,

    decisionPriority:
      decision.priority,

    decisionConfidence:
      decision.confidence,

    decisionReason:
      decision.reason,


    /*
     * Ranking.
     */

    rank,

    utilityRank:
      opportunity?.utilityRank ??
      rank,


    /*
     * Recommendation status.
     */

    primary:
      false,

    alternative:
      false,


    /*
     * User action.
     */

    recommendedAction:
      action.action,

    recommendedActionLabel:
      action.label

  };

}


/* ============================================================
 * SELECT PRIMARY
 * ============================================================
 */


/**
 * Select the primary recommendation.
 *
 * The highest utility opportunity is NOT automatically
 * selected.
 *
 * It must first pass the decision engine.
 */
function selectPrimary(
  recommendations
) {

  if (
    !Array.isArray(
      recommendations
    ) ||
    recommendations.length === 0
  ) {

    return null;

  }


  const eligibleRecommendations =
    recommendations.filter(
      recommendation =>

        recommendation.eligible !== false &&

        (
          recommendation.decision ===
          "recommend"
          ||
          recommendation.utilityScore >= 90
        )

    );


  /*
   * If the decision engine explicitly recommends
   * something, select the highest utility one.
   */

  if (
    eligibleRecommendations.length > 0
  ) {

    return (
      [...eligibleRecommendations]
        .sort(
          (a, b) =>
            b.utilityScore -
            a.utilityScore
        )[0]
    );

  }


  /*
   * If no explicit recommendation exists,
   * select the strongest eligible opportunity
   * as long as it has meaningful utility.
   */

  const fallback =
    recommendations
      .filter(
        recommendation =>
          recommendation.eligible !== false &&
          recommendation.utilityScore >= 75
      )
      .sort(
        (a, b) =>
          b.utilityScore -
          a.utilityScore
      )[0];


  return fallback || null;

}


/* ============================================================
 * BUILD RECOMMENDATION SET
 * ============================================================
 */


/**
 * Build final recommendation set.
 */
function buildRecommendationSet(
  rankedOpportunities,
  context = {}
) {

  if (
    !Array.isArray(
      rankedOpportunities
    )
  ) {

    return {

      primary:
        null,

      alternatives:
        [],

      recommendations:
        []

    };

  }


  /*
   * Convert all opportunities.
   */

  const recommendations =
    rankedOpportunities.map(
      (
        opportunity,
        index
      ) =>
        prepareRecommendation(
          opportunity,
          context,
          index + 1
        )
    );


  /*
   * Select primary.
   */

  const primary =
    selectPrimary(
      recommendations
    );


  /*
   * Mark primary.
   */

  if (
    primary
  ) {

    primary.primary =
      true;

  }


  /*
   * Alternatives.
   *
   * Alternatives should be eligible and useful.
   */

  const alternatives =
    recommendations
      .filter(
        recommendation =>

          recommendation.id !==
          primary?.id &&

          recommendation.eligible !== false &&

          recommendation.utilityScore >= 40

      )
      .sort(
        (a, b) => {

          /*
           * Decision recommendation
           * has priority.
           */

          if (
            a.decision === "recommend" &&
            b.decision !== "recommend"
          ) {

            return -1;

          }


          if (
            b.decision === "recommend" &&
            a.decision !== "recommend"
          ) {

            return 1;

          }


          /*
           * Utility score.
           */

          return (
            b.utilityScore -
            a.utilityScore
          );

        }
      );


  alternatives.forEach(
    recommendation => {

      recommendation.alternative =
        true;

    }
  );


  return {

    primary,

    alternatives,

    recommendations

  };

}


/* ============================================================
 * SUMMARY
 * ============================================================
 */


/**
 * Build recommendation summary.
 */
function buildSummary(
  recommendations,
  primary,
  alternatives
) {

  const list =
    Array.isArray(
      recommendations
    )
      ? recommendations
      : [];


  return {

    total:
      list.length,

    strongMatches:
      list.filter(
        item =>
          safeNumber(
            item.matchPercentage,
            0
          ) >= 75
      ).length,

    excellentUtility:
      list.filter(
        item =>
          item.utilityLevel ===
          "excellent"
      ).length,

    highUtility:
      list.filter(
        item =>
          item.utilityLevel ===
          "high"
      ).length,

    moderateUtility:
      list.filter(
        item =>
          item.utilityLevel ===
          "moderate"
      ).length,

    lowUtility:
      list.filter(
        item =>
          item.utilityLevel ===
          "low"
      ).length,

    blocked:
      list.filter(
        item =>
          item.eligible === false
      ).length,

    decisionRecommendations:
      list.filter(
        item =>
          item.decision ===
          "recommend"
      ).length,

    decisionAlternatives:
      list.filter(
        item =>
          item.decision ===
          "alternative"
      ).length,

    decisionDeferred:
      list.filter(
        item =>
          item.decision ===
          "defer"
      ).length,

    decisionRejected:
      list.filter(
        item =>
          item.decision ===
          "reject"
      ).length,

    primary:
      primary?.id ||
      null,

    alternatives:
      alternatives.length

  };

}


/* ============================================================
 * MAIN WORKFLOW
 * ============================================================
 */


/**
 * Generate recommendations.
 *
 * This is the main public workflow function.
 */
function generateRecommendations(
  opportunities,
  context = {}
) {

  /*
   * Step 1
   *
   * Utility ranking.
   */

  const ranked =
    rankByUtility(
      opportunities,
      context
    );


  /*
   * Step 2
   *
   * Decision engine.
   */

  const recommendationSet =
    buildRecommendationSet(
      ranked,
      context
    );


  /*
   * Step 3
   *
   * Summary.
   */

  const summary =
    buildSummary(
      recommendationSet.recommendations,
      recommendationSet.primary,
      recommendationSet.alternatives
    );


  /*
   * Step 4
   *
   * Determine next action.
   */

  let nextAction = {

    action:
      "none",

    label:
      "No action available"

  };


  if (
    recommendationSet.primary
  ) {

    nextAction = {

      action:
        recommendationSet.primary
          .recommendedAction,

      label:
        recommendationSet.primary
          .recommendedActionLabel

    };

  }


  /*
   * Step 5
   *
   * Return complete recommendation state.
   */

  return {

    success:
      true,

    primary:
      recommendationSet.primary,

    alternatives:
      recommendationSet.alternatives,

    recommendations:
      recommendationSet.recommendations,

    nextAction,

    summary

  };

}


/* ============================================================
 * LEGACY COMPATIBILITY
 * ============================================================
 */


/**
 * Some existing workflow code may call
 * recommend() instead of generateRecommendations().
 *
 * Keep both available.
 */
function recommend(
  opportunities,
  context = {}
) {

  return generateRecommendations(
    opportunities,
    context
  );

}


/* ============================================================
 * PUBLIC API
 * ============================================================
 */

module.exports = {

  generateRecommendations,

  recommend,

  buildRecommendationSet,

  prepareRecommendation,

  selectPrimary,

  buildSummary,

  buildRecommendationReason,

  determineRecommendedAction,

  runDecisionEngine

};
