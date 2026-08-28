/**
 * Ride2View Lifestyle Agent
 * AI Reasoning Engine
 *
 * Purpose:
 * Interprets normalized context and discovered opportunities.
 *
 * Responsibilities:
 * - Goal alignment
 * - Bedroom matching
 * - Location matching
 * - Budget compatibility
 * - Affordability optimization
 * - Viewing-time compatibility
 * - Mobility/context signals
 * - Canonical opportunity compatibility
 *
 * This remains deterministic so the test suite is reproducible.
 */


/* =========================================================
   HELPERS
========================================================= */

/**
 * Safely convert a value into a number.
 */
function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Extract bedrooms from either:
 *
 * opportunity.property.bedrooms
 * opportunity.bedrooms
 */
function getBedrooms(opportunity = {}) {

  const nested =
    opportunity.property?.bedrooms;

  if (nested !== null && nested !== undefined) {
    return toNumber(nested);
  }

  return toNumber(
    opportunity.bedrooms
  );
}


/**
 * Extract price from canonical or legacy fields.
 */
function getPrice(opportunity = {}) {

  const economicsPrice =
    opportunity.economics?.price;

  if (
    economicsPrice !== null &&
    economicsPrice !== undefined
  ) {
    return toNumber(economicsPrice);
  }

  return toNumber(
    opportunity.price
  );
}


/**
 * Extract viewing/availability duration.
 *
 * Supports:
 *
 * opportunity.timing.duration
 * opportunity.duration
 * opportunity.availableTime
 * opportunity.maxViewingTime
 */
function getOpportunityDuration(
  opportunity = {}
) {

  const timingDuration =
    opportunity.timing?.duration;

  if (
    timingDuration !== null &&
    timingDuration !== undefined
  ) {
    return toNumber(timingDuration);
  }

  const duration =
    toNumber(
      opportunity.duration
    );

  if (duration !== null) {
    return duration;
  }

  const availableTime =
    toNumber(
      opportunity.availableTime
    );

  if (availableTime !== null) {
    return availableTime;
  }

  return toNumber(
    opportunity.maxViewingTime
  );
}


/**
 * Extract requested viewing-time constraint.
 */
function getRequestedViewingTime(
  context = {}
) {

  const candidates = [

    context.maxViewingTime,

    context.availableTime,

    context.intent?.maxViewingTime,

    context.intent?.availableTime,

    context.constraints?.maxViewingTime,

    context.constraints?.availableTime

  ];

  for (const value of candidates) {

    const number = toNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}


/**
 * Detect whether the user explicitly wants
 * affordability optimization.
 */
function wantsAffordableOpportunity(
  context = {}
) {

  return (

    context.wantsAffordable === true ||

    context.intent?.wantsAffordable === true ||

    context.constraints?.affordable === true ||

    context.wantsBudgetOptimization === true ||

    context.intent?.wantsBudgetOptimization === true ||

    context.constraints?.budgetOptimization === true

  );
}


/**
 * Extract requested budget.
 */
function getBudget(context = {}) {

  const candidates = [

    context.budget,

    context.userBudget,

    context.intent?.budget,

    context.constraints?.budget

  ];

  for (const value of candidates) {

    const number = toNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}


/**
 * Detect bedroom requirement.
 */
function getRequestedBedrooms(
  context = {}
) {

  const candidates = [

    context.bedrooms,

    context.intent?.bedrooms,

    context.constraints?.bedrooms

  ];

  for (const value of candidates) {

    const number = toNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}


/**
 * Extract neighborhood request.
 */
function getRequestedNeighborhood(
  context = {}
) {

  return (

    context.neighborhood ||

    context.intent?.neighborhood ||

    context.location?.neighborhood ||

    context.constraints?.neighborhood ||

    null

  );
}


/**
 * Determine whether an opportunity matches
 * the requested neighborhood.
 */
function matchesNeighborhood(
  opportunity,
  neighborhood
) {

  if (!neighborhood) {
    return null;
  }

  const requested =
    String(neighborhood)
      .trim()
      .toLowerCase();

  const opportunityNeighborhood =
    opportunity.location?.neighborhood ||
    opportunity.neighborhood ||
    null;

  if (opportunityNeighborhood) {

    return String(
      opportunityNeighborhood
    )
      .toLowerCase()
      .includes(requested);
  }


  const locationText = [

    opportunity.location?.name,

    opportunity.location?.address,

    opportunity.location?.city,

    opportunity.title,

    opportunity.description,

    ...(Array.isArray(opportunity.tags)
      ? opportunity.tags
      : []),

    ...(Array.isArray(
      opportunity.relevance?.tags
    )
      ? opportunity.relevance.tags
      : [])

  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();


  return locationText.includes(
    requested
  );
}


/**
 * Determine whether the opportunity is
 * actually compatible with the requested time.
 */
function determineTimeCompatibility(
  opportunity,
  requestedTime
) {

  if (requestedTime === null) {
    return null;
  }


  /*
   * If discovery already explicitly supplied
   * compatibility, trust that signal.
   */
  if (
    opportunity.timeCompatible === true
  ) {
    return true;
  }

  if (
    opportunity.timeCompatible === false
  ) {
    return false;
  }


  const duration =
    getOpportunityDuration(
      opportunity
    );


  /*
   * Unknown duration means we cannot prove
   * compatibility.
   */
  if (duration === null) {
    return null;
  }


  return duration <= requestedTime;
}


/**
 * Determine budget compatibility.
 */
function determineBudgetCompatibility(
  opportunity,
  budget
) {

  if (budget === null) {
    return null;
  }


  const price =
    getPrice(opportunity);


  if (price === null) {
    return null;
  }


  return price <= budget;
}


/* =========================================================
   REASON ABOUT OPPORTUNITIES
========================================================= */

function reasonAboutOpportunities(
  context = {},
  opportunities = []
) {

  if (!Array.isArray(opportunities)) {
    return [];
  }


  /* =======================================================
     CONTEXT
  ======================================================= */

  const goal =
    context.goal ||
    context.userGoal ||
    context.intent?.userGoal ||
    null;


  const location =
    context.location ||
    {};


  const budget =
    getBudget(
      context
    );


  const requestedBedrooms =
    getRequestedBedrooms(
      context
    );


  const requestedViewingTime =
    getRequestedViewingTime(
      context
    );


  const requestedNeighborhood =
    getRequestedNeighborhood(
      context
    );


  const destination =
    context.destination ||
    null;


  const currentActivity =
    context.currentActivity ||
    null;


  const wantsAffordable =
    wantsAffordableOpportunity(
      context
    );


  const reasoning = [];


  /* =======================================================
     REASON ABOUT EACH OPPORTUNITY
  ======================================================= */

  opportunities.forEach(
    (opportunity) => {

      let priority = 0;

      const factors = [];


      /* =====================================================
         BASE SCORE
      ===================================================== */

      /*
       * Every valid opportunity starts from zero.
       *
       * This keeps the reasoning engine deterministic.
       */

      priority = 0;


      /* =====================================================
         GOAL ALIGNMENT
      ===================================================== */

      if (
        goal &&
        (
          opportunity.type === goal ||
          opportunity.category === goal ||
          opportunity.service === goal
        )
      ) {

        priority += 30;

        factors.push(
          "goal-alignment"
        );
      }


      /* =====================================================
         PROPERTY SIGNAL
      ===================================================== */

      if (
        opportunity.type === "property" ||
        opportunity.category === "property"
      ) {

        /*
         * A property request should naturally favor
         * property opportunities.
         */

        if (
          context.wantsProperty === true ||
          context.intent?.wantsProperty === true ||
          goal === "property"
        ) {

          priority += 15;

          factors.push(
            "property-alignment"
          );
        }
      }


      /* =====================================================
         BEDROOM MATCH
      ===================================================== */

      if (
        requestedBedrooms !== null
      ) {

        const opportunityBedrooms =
          getBedrooms(
            opportunity
          );


        if (
          opportunityBedrooms ===
          requestedBedrooms
        ) {

          priority += 40;

          factors.push(
            "bedroom-match"
          );

        } else {

          /*
           * Explicit bedroom mismatch should be
           * strongly penalized.
           */

          priority -= 40;

          factors.push(
            "bedroom-mismatch"
          );
        }
      }


      /* =====================================================
         LOCATION MATCH
      ===================================================== */

      const neighborhoodMatch =
        matchesNeighborhood(
          opportunity,
          requestedNeighborhood
        );


      if (
        neighborhoodMatch === true
      ) {

        priority += 30;

        factors.push(
          "neighborhood-match"
        );

      } else if (
        neighborhoodMatch === false
      ) {

        priority -= 20;

        factors.push(
          "neighborhood-mismatch"
        );
      }


      /* =====================================================
         EXISTING LOCATION SIGNAL
      ===================================================== */

      if (
        location?.city &&
        opportunity.locationMatch === true
      ) {

        priority += 15;

        factors.push(
          "location-context"
        );
      }


      /* =====================================================
         DESTINATION SIGNAL
      ===================================================== */

      if (
        destination &&
        (
          opportunity.type === "mobility" ||
          opportunity.type === "ride"
        )
      ) {

        priority += 25;

        factors.push(
          "destination-present"
        );
      }


      /* =====================================================
         TIME COMPATIBILITY
      ===================================================== */

      const timeCompatible =
        determineTimeCompatibility(
          opportunity,
          requestedViewingTime
        );


      if (
        timeCompatible === true
      ) {

        priority += 30;

        factors.push(
          "time-context"
        );

      } else if (
        timeCompatible === false
      ) {

        priority -= 35;

        factors.push(
          "time-conflict"
        );

      } else if (
        requestedViewingTime !== null
      ) {

        /*
         * Unknown is not automatically a conflict.
         */

        factors.push(
          "time-unknown"
        );
      }


      /* =====================================================
         BUDGET COMPATIBILITY
      ===================================================== */

      const budgetCompatible =
        determineBudgetCompatibility(
          opportunity,
          budget
        );


      if (
        budgetCompatible === true
      ) {

        priority += 20;

        factors.push(
          "budget-context"
        );

      } else if (
        budgetCompatible === false
      ) {

        /*
         * Do not destroy the opportunity.
         * It may still be an alternative.
         */

        priority -= 15;

        factors.push(
          "budget-exceeded"
        );

      } else if (
        budget !== null
      ) {

        factors.push(
          "budget-unknown"
        );
      }


      /* =====================================================
         AFFORDABILITY OPTIMIZATION
      ===================================================== */

      if (
        wantsAffordable
      ) {

        const price =
          getPrice(
            opportunity
          );


        if (
          price !== null
        ) {

          /*
           * When the user says:
           *
           * "most affordable"
           *
           * but gives NO budget,
           * cheaper opportunities receive a
           * stronger affordability signal later
           * through affordabilityScore.
           */

          if (
            budget !== null &&
            price <= budget
          ) {

            priority += 30;

            factors.push(
              "affordability-match"
            );

          } else if (
            budget !== null &&
            price > budget
          ) {

            priority -= 10;

            factors.push(
              "affordability-conflict"
            );

          } else {

            /*
             * No budget:
             * explicitly mark this opportunity
             * for price-based optimization.
             */

            factors.push(
              "affordability-optimization"
            );
          }
        }
      }


      /* =====================================================
         ACTIVITY SIGNAL
      ===================================================== */

      if (
        currentActivity &&
        (
          opportunity.type === "mobility" ||
          opportunity.type === "ride"
        )
      ) {

        priority += 10;

        factors.push(
          "activity-context"
        );
      }


      /* =====================================================
         STUDENT SIGNAL
      ===================================================== */

      if (
        context.wantsStudent === true ||
        context.intent?.wantsStudent === true
      ) {

        const text = [

          opportunity.title,

          opportunity.description,

          ...(Array.isArray(
            opportunity.tags
          )
            ? opportunity.tags
            : []),

          ...(Array.isArray(
            opportunity.relevance?.tags
          )
            ? opportunity.relevance.tags
            : [])

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        if (
          text.includes("student")
        ) {

          priority += 30;

          factors.push(
            "student-match"
          );
        }
      }


      /* =====================================================
         PREMIUM SIGNAL
      ===================================================== */

      if (
        context.wantsPremium === true ||
        context.intent?.wantsPremium === true
      ) {

        const text = [

          opportunity.title,

          opportunity.description,

          ...(Array.isArray(
            opportunity.tags
          )
            ? opportunity.tags
            : []),

          ...(Array.isArray(
            opportunity.relevance?.tags
          )
            ? opportunity.relevance.tags
            : [])

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        if (
          text.includes("luxury") ||
          text.includes("premium")
        ) {

          priority += 30;

          factors.push(
            "premium-match"
          );
        }
      }


      /* =====================================================
         WOMEN-ONLY SIGNAL
      ===================================================== */

      if (
        context.wantsWomenOnly === true ||
        context.intent?.wantsWomenOnly === true
      ) {

        const text = [

          opportunity.title,

          opportunity.description,

          ...(Array.isArray(
            opportunity.tags
          )
            ? opportunity.tags
            : []),

          ...(Array.isArray(
            opportunity.relevance?.tags
          )
            ? opportunity.relevance.tags
            : [])

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        if (
          text.includes("women-only") ||
          text.includes("women only") ||
          text.includes("female")
        ) {

          priority += 40;

          factors.push(
            "women-only-match"
          );
        }
      }


      /* =====================================================
         AFFORDABILITY SCORE
      ===================================================== */

      const price =
        getPrice(
          opportunity
        );


      let affordabilityScore =
        null;


      if (
        price !== null
      ) {

        if (
          budget !== null
        ) {

          if (
            price <= budget
          ) {

            /*
             * Higher is better.
             *
             * A cheaper option gets a stronger score.
             */

            affordabilityScore =
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (
                      1 -
                      price / budget
                    ) * 100
                  )
                )
              );

          } else {

            affordabilityScore = 0;
          }

        } else {

          /*
           * Without a budget we retain the raw price.
           *
           * The ranking layer can use this to order
           * explicitly affordable searches.
           */

          affordabilityScore =
            null;
        }
      }


      /* =====================================================
         TIME SCORE
      ===================================================== */

      let timeScore =
        null;


      if (
        requestedViewingTime !== null
      ) {

        if (
          timeCompatible === true
        ) {

          const duration =
            getOpportunityDuration(
              opportunity
            );


          if (
            duration !== null &&
            requestedViewingTime > 0
          ) {

            timeScore =
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (
                      1 -
                      duration /
                      requestedViewingTime
                    ) * 100
                  )
                )
              );

          } else {

            timeScore = 100;
          }

        } else if (
          timeCompatible === false
        ) {

          timeScore = 0;
        }
      }


      /* =====================================================
         REASONING EXPLANATION
      ===================================================== */

      const explanation =
        factors.length > 0
          ? factors.join(", ")
          : "general-opportunity";


      /* =====================================================
         ENRICH OPPORTUNITY
      ===================================================== */

      const enrichedOpportunity = {

        ...opportunity,


        /*
         * Compatibility fields are now explicitly
         * represented for downstream consumers.
         */

        bedroomsMatch:
          requestedBedrooms !== null
            ? getBedrooms(opportunity) ===
              requestedBedrooms
            : null,


        locationMatch:
          neighborhoodMatch !== null
            ? neighborhoodMatch
            : (
                opportunity.locationMatch ??
                null
              ),


        budgetCompatible,


        timeCompatible,


        affordabilityScore,


        timeScore,


        reasoningScore:
          Math.max(
            0,
            Math.round(
              priority
            )
          ),


        reasoningFactors:
          factors,


        reasoningExplanation:
          explanation

      };


      reasoning.push(
        enrichedOpportunity
      );

    }
  );


  /* =======================================================
     SORT
  ======================================================= */

  return reasoning.sort(
    (a, b) => {

      const scoreA =
        Number(
          a.reasoningScore
        ) || 0;


      const scoreB =
        Number(
          b.reasoningScore
        ) || 0;


      if (
        scoreA !== scoreB
      ) {

        return (
          scoreB -
          scoreA
        );
      }


      /*
       * When affordability is explicitly requested,
       * cheaper opportunities should win ties.
       */

      if (
        wantsAffordable
      ) {

        const priceA =
          getPrice(a);

        const priceB =
          getPrice(b);


        if (
          priceA !== null &&
          priceB !== null &&
          priceA !== priceB
        ) {

          return (
            priceA -
            priceB
          );
        }
      }


      /*
       * Stable deterministic fallback.
       */

      const idA =
        String(
          a.id || ""
        );


      const idB =
        String(
          b.id || ""
        );


      return idA.localeCompare(
        idB
      );

    }
  );

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  reasonAboutOpportunities

};
