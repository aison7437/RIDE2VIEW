/**
 * Ride2View Lifestyle Agent
 * Context Builder
 *
 * Purpose:
 * Converts raw user/request information into a normalized
 * decision context for the Lifestyle Agent.
 *
 * This layer allows future services such as maps, user
 * history, recommendations, mobility and commerce APIs
 * to contribute context without modifying the core workflow.
 */

function buildContext(input = {}) {
  const {
    request = {},
    user = {},
    userGoal = null,
    location = {},
    budget = null,
    availableTime = null,
    currentActivity = null,
    destination = null
  } = input;

  return {
    request,

    user,

    goal: userGoal,

    location,

    budget,

    availableTime,

    currentActivity,

    destination,

    signals: {
      hasLocation: Boolean(location?.available),
      hasBudget: budget !== null,
      hasTimeConstraint: availableTime !== null,
      hasDestination: Boolean(destination),
      hasCurrentActivity: Boolean(currentActivity)
    }
  };
}

module.exports = {
  buildContext
};
