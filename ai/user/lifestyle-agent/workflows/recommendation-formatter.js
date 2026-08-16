/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into
 * structured, user-facing recommendations.
 *
 * Responsibilities:
 * - Normalize ranked opportunities
 * - Preserve canonical opportunity data
 * - Generate match reasons
 * - Calculate match percentage
 * - Calculate affordability signals
 * - Prepare data for the Decision Layer
 */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function formatCurrency(value) {
  const amount = safeNumber(value, 0);

  return `KSh ${amount.toLocaleString("en-KE")}`;
}


function calculateMatchPercentage(score) {
  const numericScore = safeNumber(score);

  if (numericScore <= 0) {
    return 0;
  }

  return Number(
    Math.min(100, numericScore).toFixed(1)
  );
}


function calculateAffordabilityScore(
  price,
  budget
) {

  if (
    price === null ||
    price === undefined ||
    budget === null ||
    budget === undefined
  ) {
    return 0;
  }

  const numericPrice = safeNumber(price);
  const numericBudget = safeNumber(budget);

  if (
    numericPrice <= 0 ||
    numericBudget <= 0
  ) {
    return 0;
  }

  const difference =
    numericBudget - numericPrice;

  return Number(
    (
      difference /
      numericBudget *
      10
    ).toFixed(2)
  );
}


function buildMatchReasons(
  opportunity,
  rankedItem,
  context
) {

  const reasons = [];

  const relevance =
    opportunity.relevance ||
    rankedItem.relevance ||
    null;

  const locationMatch =
    opportunity.locationMatch === true;

  const budgetCompatible =
    opportunity.budgetCompatible === true;

  const timeCompatible =
    opportunity.timeCompatible === true;

  const preferenceMatch =
    opportunity.preferenceMatch === true;

  const budget =
    context.budget;

  const price =
    opportunity.price;

  const reasoningScore =
    safeNumber(
      rankedItem.reasoningScore ??
      opportunity.reasoningScore
    );

  // -----------------------------------------
  // Goal relevance
  // -----------------------------------------

  if (relevance === "high") {

    reasons.push(
      "Strong relevance to your current goal."
    );

  } else if (relevance === "medium") {

    reasons.push(
      "Relevant to your current goal."
    );

  }

  // -----------------------------------------
  // Location
  // -----------------------------------------

  if (locationMatch) {

    const city =
      opportunity.location?.city ||
      context.location?.city;

    if (city) {

      reasons.push(
        `Location matches ${city}.`
      );

    } else {

      reasons.push(
        "Location matches your context."
      );

    }

  }

  // -----------------------------------------
  // Budget
  // -----------------------------------------

  if (
    budgetCompatible &&
    price !== null &&
    price !== undefined &&
    budget !== null &&
    budget !== undefined
  ) {

    reasons.push(
      `Within your ${formatCurrency(budget)} budget.`
    );

    const remaining =
      safeNumber(budget) -
      safeNumber(price);

    if (remaining >= 0) {

      reasons.push(
        `Leaves approximately ${formatCurrency(
          remaining
        )} within your budget.`
      );

    }

  }

  // -----------------------------------------
  // Time
  // -----------------------------------------

  if (timeCompatible) {

    reasons.push(
      "Compatible with your available time."
    );

  }

  // -----------------------------------------
  // Preference
  // -----------------------------------------

  if (preferenceMatch) {

    reasons.push(
      "Matches your stated preference."
    );

  }

  // -----------------------------------------
  // Reasoning
  // -----------------------------------------

  if (reasoningScore > 0) {

    reasons.push(
      "The reasoning engine identified good suitability."
    );

  }

  return reasons;
}


function determineRecommendationTier(
  matchPercentage,
  opportunity
) {

  const score =
    safeNumber(matchPercentage);

  const relevance =
    opportunity.relevance;

  if (
    score >= 80 &&
    relevance === "high"
  ) {

    return "strong-match";

  }

  if (score >= 65) {

    return "good-match";

  }

  if (score >= 50) {

    return "alternative";

  }

  return "low-match";
}


function determineAction(
  opportunity,
  tier
) {

  if (
    opportunity.type === "property"
  ) {

    if (tier === "strong-match") {

      return "view-property";

    }

    if (tier === "good-match") {

      return "compare-property";

    }

    return "review-property";

  }

  if (
    opportunity.type === "mobility"
  ) {

    return "book-ride";

  }

  if (
    opportunity.type === "food"
  ) {

    return "order-food";

  }

  if (
    opportunity.type === "commerce"
  ) {

    return "shop";

  }

  return "view-opportunity";
}


function formatRecommendations(
  rankedOpportunities,
  agentContext
) {

  if (
    !Array.isArray(rankedOpportunities)
  ) {

    return [];

  }

  const context =
    agentContext || {};

  return rankedOpportunities.map(
    function (rankedItem, index) {

      const opportunity =
        rankedItem?.opportunity ||
        rankedItem ||
        {};

      const score =
        safeNumber(
          rankedItem?.score ??
          rankedItem?.rankingScore ??
          rankedItem?.totalScore
        );

      const title =
        opportunity.title ||
        opportunity.name ||
        "Lifestyle Opportunity";

      const description =
        opportunity.description ||
        opportunity.summary ||
        "";

      const category =
        opportunity.category ||
        opportunity.type ||
        null;

      const location =
        opportunity.location ||
        context.location ||
        null;

      const reasoningScore =
        safeNumber(
          rankedItem?.reasoningScore ??
          opportunity.reasoningScore
        );

      const reasoningFactors =
        Array.isArray(
          rankedItem?.reasoningFactors
        )
          ? rankedItem.reasoningFactors
          : Array.isArray(
              opportunity.reasoningFactors
            )
            ? opportunity.reasoningFactors
            : [];

      const recommendation =
        opportunity.recommendation ||
        opportunity.reason ||
        description;

      const budget =
        opportunity.budget ??
        context.budget ??
        null;

      const availableTime =
        opportunity.availableTime ??
        context.availableTime ??
        null;

      const affordabilityScore =
        safeNumber(
          rankedItem?.affordabilityScore ??
          opportunity.affordabilityScore ??
          calculateAffordabilityScore(
            opportunity.price,
            budget
          )
        );

      const matchPercentage =
        safeNumber(
          rankedItem?.matchPercentage ??
          opportunity.matchPercentage ??
          calculateMatchPercentage(score)
        );

      const matchReasons =
        buildMatchReasons(
          opportunity,
          rankedItem,
          context
        );

      const recommendationTier =
        determineRecommendationTier(
          matchPercentage,
          opportunity
        );

      const recommendedAction =
        determineAction(
          opportunity,
          recommendationTier
        );

      return {

        // -----------------------------------------
        // Ranking
        // -----------------------------------------

        rank:
          index + 1,

        score:

          score,

        matchPercentage:

          matchPercentage,

        recommendationTier:

          recommendationTier,


        // -----------------------------------------
        // Identity
        // -----------------------------------------

        id:
          opportunity.id ||
          null,

        type:
          opportunity.type ||
          null,

        title:
          title,

        description:
          description,

        category:
          category,

        service:
          opportunity.service ||
          null,


        // -----------------------------------------
        // Recommendation
        // -----------------------------------------

        relevance:
          opportunity.relevance ||
          null,

        reason:
          opportunity.reason ||
          "",

        recommendation:
          recommendation,

        matchReasons:
          matchReasons,

        recommendedAction:
          recommendedAction,


        // -----------------------------------------
        // Location
        // -----------------------------------------

        location:
          location,


        // -----------------------------------------
        // Commercial information
        // -----------------------------------------

        price:
          opportunity.price ??
          null,

        budget:
          budget,

        affordabilityScore:
          affordabilityScore,

        availability:
          opportunity.availability ||
          null,


        // -----------------------------------------
        // Time
        // -----------------------------------------

        availableTime:
          availableTime,


        // -----------------------------------------
        // Scoring internals
        // -----------------------------------------

        baseScore:
          safeNumber(
            rankedItem?.baseScore
          ),

        reasoningScore:
          reasoningScore,

        reasoningContribution:
          safeNumber(
            rankedItem?.reasoningContribution
          ),

        reasoningFactors:
          reasoningFactors,


        // -----------------------------------------
        // Compatibility signals
        // -----------------------------------------

        locationMatch:
          opportunity.locationMatch === true,

        budgetCompatible:
          opportunity.budgetCompatible === true,

        timeCompatible:
          opportunity.timeCompatible === true,

        preferenceMatch:
          opportunity.preferenceMatch === true,


        // -----------------------------------------
        // Property information
        // -----------------------------------------

        property:
          opportunity.property ||
          null,


        // -----------------------------------------
        // Source metadata
        // -----------------------------------------

        source:
          opportunity.source ||
          "ride2view",

        createdAt:
          opportunity.createdAt ||
          null

      };

    }
  );
}


module.exports = {
  formatRecommendations,
  buildMatchReasons,
  calculateAffordabilityScore,
  calculateMatchPercentage,
  determineRecommendationTier,
  determineAction
};
