/**
 * Ride2View Lifestyle Agent
 * Opportunity Discovery Tool
 *
 * Purpose:
 * Finds potentially useful Ride2View opportunities
 * and normalizes them through the canonical
 * Opportunity Schema.
 */

const {
  createOpportunity
} = require("../models/opportunity-schema");


function discoverOpportunities(context = {}) {

  const opportunities = [];

  const {
    userGoal = null,
    location = null,
    budget = null,
    availableTime = null
  } = context;


  // -----------------------------------------
  // Compatibility signals
  // -----------------------------------------

  const hasLocation =
    !!(
      location &&
      (
        location.city ||
        location.country
      )
    );

  const hasBudget =
    budget !== null &&
    budget !== undefined;

  const hasAvailableTime =
    availableTime !== null &&
    availableTime !== undefined;


  // -----------------------------------------
  // Property opportunity
  // -----------------------------------------

  if (
    userGoal === "property" ||
    userGoal === "moving" ||
    userGoal === "housing"
  ) {

    opportunities.push(
      createOpportunity({

        id: "property-search",

        type: "property",

        category: "property",

        service: "property-search",

        title: "Property Search",

        description:
          "Find properties that match the user's location, budget and housing requirements.",

        relevance: "high",

        reason:
          "The user is looking for a property.",

        recommendation:
          "Search for suitable properties in the requested location and compare options against the user's budget and available time.",

        location: location,

        budget: budget,

        availableTime: availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          hasBudget,

        timeCompatible:
          hasAvailableTime,

        preferenceMatch:
          userGoal === "property",

        source:
          "ride2view"

      })
    );
  }


  // -----------------------------------------
  // Mobility opportunity
  // -----------------------------------------

  if (
    userGoal === "transport" ||
    userGoal === "property" ||
    userGoal === "shopping"
  ) {

    opportunities.push(
      createOpportunity({

        id: "ride-service",

        type: "mobility",

        category: "mobility",

        service: "ride",

        title: "Ride Service",

        description:
          "Arrange transportation that can support the user's journey.",

        relevance: "medium",

        reason:
          "Transportation may improve the user's journey.",

        recommendation:
          "Consider a suitable ride when transportation is needed for viewing properties, shopping or reaching a destination.",

        location: location,

        budget: budget,

        availableTime: availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          hasBudget,

        timeCompatible:
          hasAvailableTime,

        preferenceMatch:
          userGoal === "transport",

        source:
          "ride2view"

      })
    );
  }


  // -----------------------------------------
  // Food opportunity
  // -----------------------------------------

  if (
    userGoal === "food" ||
    userGoal === "daily-planning"
  ) {

    opportunities.push(
      createOpportunity({

        id: "food-delivery",

        type: "food",

        category: "food",

        service: "food-delivery",

        title: "Food Delivery",

        description:
          "Find food delivery options that fit the user's current needs.",

        relevance: "medium",

        reason:
          "Food services may be relevant to the user's current need.",

        recommendation:
          "Consider nearby food delivery options that fit the user's preferences and available time.",

        location: location,

        budget: budget,

        availableTime: availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          hasBudget,

        timeCompatible:
          hasAvailableTime,

        preferenceMatch:
          userGoal === "food",

        source:
          "ride2view"

      })
    );
  }


  // -----------------------------------------
  // Marketplace opportunity
  // -----------------------------------------

  if (
    userGoal === "shopping" ||
    userGoal === "moving" ||
    userGoal === "housing"
  ) {

    opportunities.push(
      createOpportunity({

        id: "marketplace",

        type: "commerce",

        category: "commerce",

        service: "marketplace",

        title: "Marketplace",

        description:
          "Find products and services that may support the user's goal.",

        relevance: "medium",

        reason:
          "Marketplace products may support the user's goal.",

        recommendation:
          "Consider relevant marketplace products or services that fit the user's requirements.",

        location: location,

        budget: budget,

        availableTime: availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          hasBudget,

        timeCompatible:
          hasAvailableTime,

        preferenceMatch:
          userGoal === "shopping",

        source:
          "ride2view"

      })
    );
  }


  return {

    success: true,

    context: {

      userGoal,

      location,

      budget,

      availableTime

    },

    opportunities

  };
}


module.exports = {
  discoverOpportunities
};
