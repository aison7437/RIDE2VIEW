/**
 * Ride2View Lifestyle Agent
 * Opportunity Discovery Tool
 *
 * Discovers actual opportunities and converts them
 * into the canonical Opportunity schema.
 *
 * Budget compatibility uses three states:
 *
 * true  = opportunity is confirmed within budget
 * false = opportunity is confirmed outside budget
 * null  = price is unknown, so compatibility
 *         cannot be determined
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
        //
        // Three-state logic:
        //
        // true  = price known and affordable
        // false = price known and unaffordable
        // null  = price unknown
        //

        let budgetCompatible = null;


        const propertyPrice =
          Number(property.price);


        if (
          hasBudget &&
          Number.isFinite(propertyPrice) &&
          propertyPrice > 0
        ) {

          budgetCompatible =
            propertyPrice <=
            Number(budget);

        }



        const timeCompatible =
          hasAvailableTime;


        const preferenceMatch =
          userGoal === "property";



        // -------------------------------------
        // Relevance
        // -------------------------------------

        const relevance =
          budgetCompatible === true &&
          locationMatch
            ? "high"
            : locationMatch
              ? "medium"
              : "medium";



        // -------------------------------------
        // Reason
        // -------------------------------------

        let reason =
          "Property may be relevant to the user's property search.";


        if (
          locationMatch &&
          budgetCompatible === true
        ) {

          reason =
            "Property matches the user's location and budget.";

        } else if (
          locationMatch &&
          budgetCompatible === false
        ) {

          reason =
            "Property matches the user's location but exceeds the stated budget.";

        } else if (
          locationMatch &&
          budgetCompatible === null
        ) {

          reason =
            "Property matches the user's location, but budget compatibility cannot be verified.";

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

        /*
         * The Ride Service does not currently
         * have a known price.
         *
         * Therefore budget compatibility cannot
         * be determined.
         */

        price:
          null,

        budgetCompatible:
          null,

        locationMatch:
          hasLocation,

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

        price:
          null,

        locationMatch:
          hasLocation,

        /*
         * No food price has been supplied yet.
         */

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

        price:
          null,

        locationMatch:
          hasLocation,

        /*
         * Marketplace price is not known at
         * discovery time.
         */

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
