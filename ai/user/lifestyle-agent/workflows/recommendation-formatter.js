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

  var context = agentContext || {};

  return rankedOpportunities.map(function (rankedItem, index) {

    rankedItem = rankedItem || {};

    // The scoring model stores the original
    // opportunity inside rankedItem.opportunity.
    var opportunity =
      rankedItem.opportunity ||
      rankedItem;

    var score =
      Number(rankedItem.score) || 0;

    var reasoningScore =
      Number(rankedItem.reasoningScore) || 0;

    var reasoningFactors =
      Array.isArray(opportunity.reasoningFactors)
        ? opportunity.reasoningFactors
        : [];

    var title =
      opportunity.title ||
      opportunity.name ||
      "Lifestyle Opportunity";

    var description =
      opportunity.description ||
      opportunity.summary ||
      "";

    var category =
      opportunity.category ||
      opportunity.type ||
      null;

    var recommendation =
      opportunity.recommendation ||
      opportunity.reason ||
      opportunity.description ||
      "";

    var location =
      opportunity.location ||
      context.location ||
      null;

    var budget =
      opportunity.budget ||
      context.budget ||
      null;

    var availableTime =
      opportunity.availableTime ||
      context.availableTime ||
      null;

    return {

      rank:
        index + 1,

      id:
        opportunity.id ||
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

      score:
        score,

      baseScore:
        Number(rankedItem.baseScore) || 0,

      reasoningScore:
        reasoningScore,

      reasoningContribution:
        Number(
          rankedItem.reasoningContribution
        ) || 0,

      reasoningFactors:
        reasoningFactors,

      budget:
        budget,

      availableTime:
        availableTime

    };

  });
}

module.exports = {
  formatRecommendations:
    formatRecommendations
};      context.budget ||
      null;

    var availableTime =
      opportunity.availableTime ||
      context.availableTime ||
      null;

    return {
      rank: index + 1,

      id:
        opportunity.id ||
        null,

      title: title,

      description: description,

      category: category,

      location: location,

      score: score,

      reasoningScore: reasoningScore,

      reasoningFactors: reasoningFactors,

      recommendation: recommendation,

      budget: budget,

      availableTime: availableTime
    };

  });
}

module.exports = {
  formatRecommendations: formatRecommendations
};
