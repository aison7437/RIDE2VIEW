/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into
 * structured user recommendations.
 *
 * Preserves:
 * - Raw score
 * - Normalized match percentage
 * - Reasoning score
 * - Reasoning contribution
 * - Affordability score
 */


function formatRecommendations(
  rankedOpportunities,
  agentContext
) {

  if (!Array.isArray(rankedOpportunities)) {
    return [];
  }


  const context =
    agentContext || {};


  return rankedOpportunities.map(
    function (rankedItem, index) {

      const opportunity =
        rankedItem.opportunity ||
        rankedItem ||
        {};


      // -----------------------------------------
      // Raw score
      // -----------------------------------------

      const score =
        Number(rankedItem.score) ||
        Number(rankedItem.rankingScore) ||
        Number(rankedItem.totalScore) ||
        0;


      // -----------------------------------------
      // Match percentage
      // -----------------------------------------
      //
      // Primary source:
      // rankedItem.matchPercentage
      //
      // Fallback:
      // Calculate from the raw score if necessary.
      //

      let matchPercentage =
        Number(
          rankedItem.matchPercentage
        );


      if (
        !Number.isFinite(matchPercentage)
      ) {

        matchPercentage =
          (score / 140) * 100;

      }


      // Keep percentage between 0 and 100

      matchPercentage =
        Math.max(
          0,
          Math.min(
            matchPercentage,
            100
          )
        );


      // Round to one decimal place

      matchPercentage =
        Number(
          matchPercentage.toFixed(1)
        );


      // -----------------------------------------
      // Basic opportunity information
      // -----------------------------------------

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


      // -----------------------------------------
      // Reasoning
      // -----------------------------------------

      const reasoningScore =
        Number(rankedItem.reasoningScore) ||
        Number(opportunity.reasoningScore) ||
        0;


      const reasoningFactors =
        Array.isArray(
          rankedItem.reasoningFactors
        )
          ? rankedItem.reasoningFactors
          : Array.isArray(
              opportunity.reasoningFactors
            )
              ? opportunity.reasoningFactors
              : [];


      // -----------------------------------------
      // Recommendation explanation
      // -----------------------------------------

      const recommendation =
        opportunity.recommendation ||
        opportunity.reason ||
        description;


      // -----------------------------------------
      // User context
      // -----------------------------------------

      const budget =
        opportunity.budget ??
        context.budget ??
        null;


      const availableTime =
        opportunity.availableTime ??
        context.availableTime ??
        null;


      // -----------------------------------------
      // Final structured recommendation
      // -----------------------------------------

      return {

        rank:
          index + 1,


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


        relevance:
          opportunity.relevance ||
          null,


        reason:
          opportunity.reason ||
          "",


        recommendation:
          recommendation,


        location:
          location,


        price:
          opportunity.price ??
          null,


        availability:
          opportunity.availability ||
          null,


        // ---------------------------------------
        // Scoring
        // ---------------------------------------

        score:
          score,


        matchPercentage:
          matchPercentage,


        baseScore:
          Number(
            rankedItem.baseScore
          ) || 0,


        reasoningScore:
          reasoningScore,


        reasoningContribution:
          Number(
            rankedItem.reasoningContribution
          ) || 0,


        affordabilityScore:
          Number(
            rankedItem.affordabilityScore
          ) || 0,


        reasoningFactors:
          reasoningFactors,


        // ---------------------------------------
        // Context
        // ---------------------------------------

        budget:
          budget,


        availableTime:
          availableTime

      };

    }
  );
}


module.exports = {
  formatRecommendations
};
