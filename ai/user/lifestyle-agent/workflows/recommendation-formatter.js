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

  return rankedOpportunities.map(function (opportunity, index) {

    opportunity = opportunity || {};

    var score = Number(opportunity.score);

    if (!score) {
      score = Number(opportunity.rankingScore);
    }

    if (!score) {
      score = Number(opportunity.totalScore);
    }

    if (!score) {
      score = 0;
    }

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
      null;

    var location =
      opportunity.location ||
      context.location ||
      null;

    var reasoningScore =
      Number(opportunity.reasoningScore) || 0;

    var reasoningFactors =
      Array.isArray(opportunity.reasoningFactors)
        ? opportunity.reasoningFactors
        : [];

    var recommendation =
      opportunity.recommendation ||
      opportunity.reason ||
      description;

    var budget =
      opportunity.budget ||
      context.budget ||
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
