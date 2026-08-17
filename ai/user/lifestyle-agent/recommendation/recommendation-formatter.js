/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Purpose:
 * Converts ranked opportunities into
 * structured user-facing recommendations.
 *
 * This layer does not execute:
 * payments, bookings, purchases,
 * or other consequential actions.
 */

function formatRecommendation(
  rankedOpportunity = {},
  context = {}
) {

  /*
   * The scoring model now preserves the opportunity
   * fields directly on rankedOpportunity.
   *
   * We also support the older nested structure
   * rankedOpportunity.opportunity for compatibility.
   */

  const opportunity =
    (
      rankedOpportunity.opportunity &&
      typeof rankedOpportunity.opportunity === "object" &&
      Object.keys(rankedOpportunity.opportunity).length > 0
    )
      ? rankedOpportunity.opportunity
      : rankedOpportunity;


  const score =
    Number(rankedOpportunity.score) || 0;


  const reasoningScore =
    Number(rankedOpportunity.reasoningScore) || 0;


  const reasoningFactors =
    Array.isArray(
      rankedOpportunity.reasoningFactors
    )
      ? rankedOpportunity.reasoningFactors
      : [];


  // -----------------------------------------
  // 1. Determine priority
  // -----------------------------------------

  let priority = "low";


  if (score >= 70) {

    priority = "high";

  } else if (score >= 40) {

    priority = "medium";

  }


  // -----------------------------------------
  // 2. Build explanation reasons
  // -----------------------------------------

  const reasons = [];


  if (opportunity.relevance) {

    reasons.push(
      `Goal relevance: ${opportunity.relevance}`
    );

  }


  if (opportunity.locationMatch === true) {

    reasons.push(
      "Location matches the user's context"
    );

  }


  if (opportunity.budgetCompatible === true) {

    reasons.push(
      "Budget appears compatible"
    );

  }


  if (opportunity.timeCompatible === true) {

    reasons.push(
      "Available time appears compatible"
    );

  }


  if (opportunity.preferenceMatch === true) {

    reasons.push(
      "Matches user preferences"
    );

  }


  reasoningFactors.forEach(
    (factor) => {

      if (
        factor &&
        !reasons.includes(String(factor))
      ) {

        reasons.push(
          String(factor)
        );

      }

    }
  );


  // -----------------------------------------
  // 3. Determine service
  // -----------------------------------------

  const service =
    opportunity.service ||
    opportunity.type ||
    "Ride2View service";


  // -----------------------------------------
  // 4. Build formatted recommendation
  // -----------------------------------------

  return {

    /*
     * Preserve all canonical opportunity fields.
     */
    ...opportunity,


    /*
     * Ensure ranking fields are present.
     */
    score,

    reasoningScore,


    /*
     * Ensure core identity fields exist.
     */
    id:
      opportunity.id || null,

    service,

    type:
      opportunity.type || null,

    category:
      opportunity.category || null,


    /*
     * Presentation fields.
     */
    priority,

    title:
      opportunity.title ||
      `Recommended: ${service}`,

    explanation:
      reasons.length > 0
        ? reasons.join(". ") + "."
        : "This opportunity may be relevant to the user's current context.",

    reasons,


    /*
     * Keep a canonical nested copy for
     * downstream compatibility.
     */
    opportunity,


    context

  };

}


/**
 * Format all ranked opportunities.
 */
function formatRecommendations(
  rankedOpportunities = [],
  context = {}
) {

  if (
    !Array.isArray(
      rankedOpportunities
    )
  ) {

    return [];

  }


  return rankedOpportunities.map(
    (opportunity) =>
      formatRecommendation(
        opportunity,
        context
      )
  );

}


module.exports = {

  formatRecommendation,

  formatRecommendations

};
