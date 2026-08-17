/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Purpose:
 * Converts ranked lifestyle opportunities into
 * actionable recommendations.
 *
 * Pipeline:
 *
 * Ranked Opportunities
 *        ↓
 * Decision Engine
 *        ↓
 * Primary Recommendation
 *        ↓
 * Alternatives
 *        ↓
 * Next Action
 *        ↓
 * Recommendation Output
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
  decideRecommendations
} = require("../decision-engine");


/* ============================================================
 * SAFE HELPERS
 * ============================================================
 */

function safeNumber(
  value,
  fallback = 0
) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


function normalize(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


/* ============================================================
 * ACTION RESOLUTION
 * ============================================================
 */

/**
 * Determine the default action for an opportunity.
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

  if (
    type === "property" ||
    service === "property-search"
  ) {

    return "view-property";

  }


  if (
    type === "mobility" ||
    service === "ride"
  ) {

    return "book-ride";

  }


  if (
    type === "food" ||
    service.includes("food")
  ) {

    return "order-food";

  }


  if (
    type === "event" ||
    service.includes("event")
  ) {

    return "view-event";

  }


  if (
    type === "cargo" ||
    service.includes("cargo")
  ) {

    return "book-cargo";

  }


  return "view-opportunity";

}


/* ============================================================
 * REASON GENERATION
 * ============================================================
 */

function buildRecommendationReason(
  opportunity,
  context = {}
) {

  const reasons = [];


  if (
    opportunity?.utilityFactors?.goalFit >= 80
  ) {

    reasons.push(
      "strongly matches your goal"
    );

  }


  if (
    opportunity?.utilityFactors?.locationFit >= 80
  ) {

    reasons.push(
      "matches your location"
    );

  }


  if (
    opportunity?.utilityFactors?.budgetFit >= 80
  ) {

    reasons.push(
      "fits your budget"
    );

  }
  else if (
    opportunity?.constraintWarnings?.some(
      warning =>
        warning?.type === "budget"
    )
  ) {

    reasons.push(
      "is slightly above your budget"
    );

  }


  if (
    opportunity?.utilityFactors?.preferenceFit >= 80
  ) {

    reasons.push(
      "matches your preferences"
    );

  }


  if (
    opportunity?.utilityFactors?.timeFit >= 80
  ) {

    reasons.push(
      "fits your available time"
    );

  }


  if (
    reasons.length === 0
  ) {

    return (
      opportunity?.reason ||
      "This opportunity may be suitable based on the available information."
    );

  }


  const reasonText =
    reasons.join(", ");


  return (
    reasonText.charAt(0).toUpperCase() +
    reasonText.slice(1) +
    "."
  );

}


/* ============================================================
 * RECOMMENDATION FORMATTER
 * ============================================================
 */

function formatRecommendation(
  opportunity,
  rank,
  isPrimary = false
) {

  const action =
    opportunity?.recommendedAction ||
    determineRecommendedAction(
      opportunity
    );


  return {

    ...opportunity,

    rank,

    decision:
      opportunity?.decision ||
      null,

    priority:
      opportunity?.priority ||
      null,

    primary:
      isPrimary,

    reason:
      buildRecommendationReason(
        opportunity
      ),

    recommendedAction:
      action

  };

}


/* ============================================================
 * PRIMARY SELECTION
 * ============================================================
 */

/**
 * Select the best eligible recommendation.
 */
function selectPrimary(
  opportunities
) {

  if (
    !Array.isArray(opportunities) ||
    opportunities.length === 0
  ) {

    return null;

  }


  /*
   * Prefer opportunities explicitly
   * marked as recommended by decision engine.
   */

  const recommended =
    opportunities.find(
      opportunity =>
        opportunity?.decision === "recommend" &&
        opportunity?.eligible !== false
    );


  if (
    recommended
  ) {

    return recommended;

  }


  /*
   * Otherwise use the highest-ranked
   * eligible opportunity.
   */

  const eligible =
    opportunities.find(
      opportunity =>
        opportunity?.eligible !== false
    );


  return (
    eligible ||
    opportunities[0]
  );

}


/* ============================================================
 * ALTERNATIVES
 * ============================================================
 */

function selectAlternatives(
  opportunities,
  primary
) {

  if (
    !Array.isArray(opportunities)
  ) {

    return [];

  }


  return opportunities
    .filter(
      opportunity =>
        opportunity?.id !==
        primary?.id
    );

}


/* ============================================================
 * NEXT ACTION
 * ============================================================
 */

function buildNextAction(
  primary
) {

  if (
    !primary
  ) {

    return {

      action:
        "none",

      label:
        "No suitable opportunity found."

    };

  }


  const action =
    primary.recommendedAction ||
    determineRecommendedAction(
      primary
    );


  const labels = {

    "view-property":
      "View property",

    "book-ride":
      "Book ride",

    "order-food":
      "Order food",

    "view-event":
      "View event",

    "book-cargo":
      "Book cargo",

    "view-opportunity":
      "View opportunity"

  };


  return {

    action,

    label:
      labels[action] ||
      "View opportunity"

  };

}


/* ============================================================
 * SUMMARY
 * ============================================================
 */

function buildSummary(
  opportunities
) {

  const list =
    Array.isArray(opportunities)
      ? opportunities
      : [];


  return {

    total:
      list.length,

    strongMatches:
      list.filter(
        opportunity =>
          safeNumber(
            opportunity?.matchPercentage
          ) >= 75
      ).length,

    excellentUtility:
      list.filter(
        opportunity =>
          opportunity?.utilityLevel ===
          "excellent"
      ).length,

    highUtility:
      list.filter(
        opportunity =>
          opportunity?.utilityLevel ===
          "high"
      ).length,

    moderateUtility:
      list.filter(
        opportunity =>
          opportunity?.utilityLevel ===
          "moderate"
      ).length,

    lowUtility:
      list.filter(
        opportunity =>
          opportunity?.utilityLevel ===
          "low"
      ).length,

    blocked:
      list.filter(
        opportunity =>
          opportunity?.eligible === false
      ).length,

    alternatives:
      Math.max(
        list.length - 1,
        0
      )

  };

}


/* ============================================================
 * MAIN RECOMMENDATION ENGINE
 * ============================================================
 */

/**
 * Generate lifestyle recommendations.
 *
 * IMPORTANT:
 * This exact function name is exported because
 * lifestyle-agent/index.js imports:
 *
 * generateLifestyleRecommendations
 */
function generateLifestyleRecommendations(
  opportunities,
  context = {}
) {

  if (
    !Array.isArray(
      opportunities
    )
  ) {

    return {

      success: false,

      recommendations: [],

      primary: null,

      alternatives: [],

      nextAction: {

        action:
          "none",

        label:
          "No recommendations available."

      },

      summary:
        buildSummary([])

    };

  }


  /*
   * ----------------------------------------------------------
   * STEP 1 — UTILITY RANKING
   * ----------------------------------------------------------
   */

  const ranked =
    rankByUtility(
      opportunities,
      context
    );


  /*
   * ----------------------------------------------------------
   * STEP 2 — DECISION ENGINE
   * ----------------------------------------------------------
   *
   * Decision engine determines:
   *
   * recommend
   * consider
   * reject
   * defer
   */

  let decided =
    ranked;


  if (
    typeof decideRecommendations ===
    "function"
  ) {

    decided =
      decideRecommendations(
        ranked,
        context
      );

  }
  else if (
    typeof makeDecision ===
    "function"
  ) {

    decided =
      ranked.map(
        opportunity => {

          const decision =
            makeDecision(
              opportunity,
              context
            );

          return {

            ...opportunity,

            ...(decision || {})

          };

        }
      );

  }


  /*
   * ----------------------------------------------------------
   * STEP 3 — RE-RANK AFTER DECISION
   * ----------------------------------------------------------
   */

  const decisionRanked =
    [...decided]
      .sort(
        (
          a,
          b
        ) => {

          const aEligible =
            a?.eligible !== false;

          const bEligible =
            b?.eligible !== false;


          if (
            aEligible !==
            bEligible
          ) {

            return aEligible
              ? -1
              : 1;

          }


          const aPriority =
            safeNumber(
              a?.priorityScore,
              safeNumber(
                a?.utilityScore,
                0
              )
            );

          const bPriority =
            safeNumber(
              b?.priorityScore,
              safeNumber(
                b?.utilityScore,
                0
              )
            );


          return (
            bPriority -
            aPriority
          );

        }
      );


  /*
   * ----------------------------------------------------------
   * STEP 4 — SELECT PRIMARY
   * ----------------------------------------------------------
   */

  const primaryOpportunity =
    selectPrimary(
      decisionRanked
    );


  /*
   * ----------------------------------------------------------
   * STEP 5 — SELECT ALTERNATIVES
   * ----------------------------------------------------------
   */

  const alternativeOpportunities =
    selectAlternatives(
      decisionRanked,
      primaryOpportunity
    );


  /*
   * ----------------------------------------------------------
   * STEP 6 — FORMAT OUTPUT
   * ----------------------------------------------------------
   */

  const primary =
    primaryOpportunity
      ? formatRecommendation(
          primaryOpportunity,
          1,
          true
        )
      : null;


  const alternatives =
    alternativeOpportunities.map(
      (
        opportunity,
        index
      ) =>
        formatRecommendation(
          opportunity,
          index + 2,
          false
        )
    );


  /*
   * ----------------------------------------------------------
   * STEP 7 — NEXT ACTION
   * ----------------------------------------------------------
   */

  const nextAction =
    buildNextAction(
      primary
    );


  /*
   * ----------------------------------------------------------
   * STEP 8 — SUMMARY
   * ----------------------------------------------------------
   */

  const summary =
    buildSummary(
      decisionRanked
    );


  /*
   * ----------------------------------------------------------
   * FINAL RESULT
   * ----------------------------------------------------------
   */

  return {

    success: true,

    primary,

    alternatives,

    nextAction,

    summary,

    recommendations: [

      ...(primary
        ? [primary]
        : []),

      ...alternatives

    ]

  };

}


/* ============================================================
 * ALIAS
 * ============================================================
 *
 * Allows other workflow modules to use either name.
 */

const generateRecommendations =
  generateLifestyleRecommendations;


/* ============================================================
 * PUBLIC API
 * ============================================================
 */

module.exports = {

  generateLifestyleRecommendations,

  generateRecommendations,

  selectPrimary,

  selectAlternatives,

  determineRecommendedAction,

  buildRecommendationReason,

  buildNextAction,

  buildSummary,

  formatRecommendation

};
