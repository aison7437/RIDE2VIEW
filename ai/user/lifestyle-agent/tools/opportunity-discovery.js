/**
 * Ride2View Lifestyle Agent
 * Opportunity Discovery Tool
 *
 * Discovers actual opportunities and converts them
 * into the canonical Opportunity schema.
 *
 * Budget logic:
 * - Known price + within budget  = budgetCompatible: true
 * - Known price + over budget     = budgetCompatible: false
 * - Unknown price                = budgetCompatible: null
 *
 * This prevents the agent from claiming that an
 * opportunity fits the user's budget when its price
 * is not actually known.
 */


const {
  properties
} = require("../data/properties");

const {
  adaptProperties
} = require("../adapters/property-adapter");

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
  // Context signals
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
    budget !== undefined &&
    Number.isFinite(
      Number(budget)
    );


  const hasAvailableTime =
    availableTime !== null &&
    availableTime !== undefined;


  // -----------------------------------------
  // Property opportunities
  // -----------------------------------------

  if (
    userGoal === "property" ||
    userGoal === "moving" ||
    userGoal === "housing"
  ) {

    const propertyOpportunities =
      adaptProperties(properties);


    propertyOpportunities.forEach(
      (property) => {

        const propertyCity =
          property.location?.city;


        const userCity =
          location?.city;


        const locationMatch =
          !!(
            userCity &&
            propertyCity &&
            userCity.toLowerCase() ===
            propertyCity.toLowerCase()
          );


        // -------------------------------------
        // Property budget compatibility
        // -------------------------------------

        const propertyPrice =
          Number(property.price);


        let budgetCompatible =
          null;


        if (
          hasBudget &&
          Number.isFinite(propertyPrice) &&
          propertyPrice > 0
        ) {

          budgetCompatible =
            propertyPrice <= Number(budget);

        }


        // -------------------------------------
        // Time compatibility
        // -------------------------------------

        const timeCompatible =
          hasAvailableTime;


        // -------------------------------------
        // Preference match
        // -------------------------------------

        const preferenceMatch =
          userGoal === "property";


        // -------------------------------------
        // Relevance
        // -------------------------------------

        let relevance =
          "medium";


        if (
          budgetCompatible === true &&
          locationMatch
        ) {

          relevance =
            "high";

        } else if (
          locationMatch
        ) {

          relevance =
            "medium";

        }


        // -------------------------------------
        // Reason
        // -------------------------------------

        let reason;


        if (
          budgetCompatible === true &&
          locationMatch
        ) {

          reason =
            "Property matches the user's location and budget.";

        } else if (
          budgetCompatible === false &&
          locationMatch
        ) {

          reason =
            "Property matches the user's location but exceeds the stated budget.";

        } else if (
          budgetCompatible === false
        ) {

          reason =
            "Property may be relevant, but its price exceeds the stated budget.";

        } else if (
          locationMatch
        ) {

          reason =
            "Property matches the user's location, but budget compatibility could not be fully verified.";

        } else {

          reason =
            "Property may be relevant to the user's property search.";

        }


        opportunities.push({

          ...property,

          locationMatch,

          budgetCompatible,

          timeCompatible,

          preferenceMatch,

          relevance,

          reason

        });

      }
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

        id:
          "ride-service",

        type:
          "mobility",

        category:
          "mobility",

        service:
          "ride",

        title:
          "Ride Service",

        description:
          "Arrange transportation that can support the user's journey.",

        relevance:
          "medium",

        reason:
          "Transportation may improve the user's journey.",

        recommendation:
          "Consider a suitable ride when transportation is needed.",

        location:
          location,

        budget:
          budget,

        availableTime:
          availableTime,

        locationMatch:
          hasLocation,

        // -------------------------------------
        // IMPORTANT:
        // We do NOT know the ride price here.
        // Therefore budget compatibility is
        // unknown rather than true.
        // -------------------------------------

        budgetCompatible:
          null,

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

        id:
          "food-delivery",

        type:
          "food",

        category:
          "food",

        service:
          "food-delivery",

        title:
          "Food Delivery",

        description:
          "Find food delivery options that fit the user's current needs.",

        relevance:
          "medium",

        reason:
          "Food services may be relevant to the user's current need.",

        recommendation:
          "Consider nearby food delivery options.",

        location:
          location,

        budget:
          budget,

        availableTime:
          availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          null,

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

        id:
          "marketplace",

        type:
          "commerce",

        category:
          "commerce",

        service:
          "marketplace",

        title:
          "Marketplace",

        description:
          "Find products and services that may support the user's goal.",

        relevance:
          "medium",

        reason:
          "Marketplace products may support the user's goal.",

        recommendation:
          "Consider relevant marketplace products or services.",

        location:
          location,

        budget:
          budget,

        availableTime:
          availableTime,

        locationMatch:
          hasLocation,

        budgetCompatible:
          null,

        timeCompatible:
          hasAvailableTime,

        preferenceMatch:
          userGoal === "shopping",

        source:
          "ride2view"

      })
    );

  }


  // -----------------------------------------
  // Return discovery result
  // -----------------------------------------

  return {

    success:
      true,

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
