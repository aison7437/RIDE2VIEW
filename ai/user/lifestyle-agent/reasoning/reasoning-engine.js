/**
 * Ride2View Lifestyle Agent
 * AI Reasoning Engine
 *
 * Purpose:
 * Interprets normalized context and discovered opportunities.
 *
 * This is currently a deterministic reasoning foundation.
 * An external LLM can be connected later through a model adapter.
 */

function reasonAboutOpportunities(
  context = {},
  opportunities = []
) {

  const reasoning = [];

  const {
    goal = null,
    location = {},
    budget = null,
    availableTime = null,
    currentActivity = null,
    destination = null
  } = context;


  // Goal alignment
  opportunities.forEach((opportunity) => {

    let priority = 0;
    const factors = [];


    // Goal relevance
    if (
      goal &&
      (
        opportunity.type === goal ||
        opportunity.category === goal
      )
    ) {
      priority += 30;
      factors.push("goal-alignment");
    }


    // Destination signal
    if (
      destination &&
      opportunity.type === "mobility"
    ) {
      priority += 25;
      factors.push("destination-present");
    }


    // Location signal
    if (
      location?.city &&
      opportunity.locationMatch
    ) {
      priority += 15;
      factors.push("location-context");
    }


    // Time signal
    if (
      availableTime !== null &&
      opportunity.timeCompatible
    ) {
      priority += 10;
      factors.push("time-context");
    }


    // Budget signal
    if (
      budget !== null &&
      opportunity.budgetCompatible
    ) {
      priority += 10;
      factors.push("budget-context");
    }


    // Activity signal
    if (
      currentActivity &&
      opportunity.type === "mobility"
    ) {
      priority += 10;
      factors.push("activity-context");
    }


    reasoning.push({
      opportunity,
      reasoningScore: priority,
      factors
    });
  });


  return reasoning.sort(
    (a, b) =>
      b.reasoningScore -
      a.reasoningScore
  );
}


module.exports = {
  reasonAboutOpportunities
};
