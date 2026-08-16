/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into
 * structured user recommendations.
 */

function formatRecommendations(
  rankedOpportunities,
  agentContext
) {

  if (!Array.isArray(rankedOpportunities)) {
    return [];
  }

  const context = agentContext || {};

  return rankedOpportunities.map(
    function (rankedItem, index) {

      const opportunity =
        rankedItem.opportunity ||
        rankedItem ||
        {};

      const score =
        Number(rankedItem.score) ||
        Number(rankedItem.rankingScore) ||
        Number(rankedItem.totalScore) ||
        0;

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
        Number(rankedItem.reasoningScore) ||
        Number(opportunity.reasoningScore) ||
        0;

      const reasoningFactors =
        Array.isArray(rankedItem.reasoningFactors)
          ? rankedItem.reasoningFactors
          : Array.isArray(opportunity.reasoningFactors)
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

        score:
          score,

        baseScore:
          Number(rankedItem.baseScore) ||
          0,

        reasoningScore:
          reasoningScore,

        reasoningContribution:
          Number(rankedItem.reasoningContribution) ||
          0,

        reasoningFactors:
          reasoningFactors,

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
