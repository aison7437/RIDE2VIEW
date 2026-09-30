/* =========================================================
 * CANONICAL OPPORTUNITY REASONING COMPATIBILITY
 * =========================================================
 *
 * Adds the new Step 2 reasoning signals without replacing
 * the existing Ride2View reasoning engine.
 *
 * Supported signals:
 * - bedroomsMatch
 * - budgetCompatible
 * - timeCompatible
 * - affordabilityScore
 * - timeScore
 * - reasoningFactors
 */

function rvNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}


function rvBedrooms(opportunity = {}) {
  if (
    opportunity.property &&
    opportunity.property.bedrooms !== null &&
    opportunity.property.bedrooms !== undefined
  ) {
    return rvNumber(opportunity.property.bedrooms);
  }

  return rvNumber(opportunity.bedrooms);
}


function rvPrice(opportunity = {}) {
  if (
    opportunity.economics &&
    opportunity.economics.price !== null &&
    opportunity.economics.price !== undefined
  ) {
    return rvNumber(opportunity.economics.price);
  }

  return rvNumber(opportunity.price);
}


function rvBudget(context = {}) {
  return rvNumber(
    context.budget ??
    context.userBudget ??
    context.intent?.budget ??
    context.constraints?.budget
  );
}


function rvRequestedBedrooms(context = {}) {
  return rvNumber(
    context.bedrooms ??
    context.intent?.bedrooms ??
    context.constraints?.bedrooms
  );
}


function minutes(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)?$/i);
  if (!match) return null;
  const amount = Number(match[1]) * (/^h/i.test(match[2] || "") ? 60 : 1);
  return amount > 0 ? amount : null;
}

function rvRequestedTime(context = {}) {
  return minutes(context.maxViewingTime ?? context.intent?.maxViewingTime ??
    context.constraints?.maxViewingTime ?? context.availableTime);
}

function rvDuration(opportunity = {}) {
  // A customer's requested time limit is not a measured opportunity duration.
  return minutes(opportunity.timing?.duration ?? opportunity.duration ?? opportunity.viewingDurationMinutes);
}

/**
 * Apply the new reasoning signals to an already
 * reasoned opportunity.
 *
 * This function intentionally does NOT replace the
 * original reasoning score.
 */
function enrichOpportunityReasoning(
  context = {},
  opportunity = {}
) {

  const enriched = {
    ...opportunity
  };


  const factors = Array.isArray(
    opportunity.reasoningFactors
  )
    ? [...opportunity.reasoningFactors]
    : [];


  /* -------------------------------------------------------
   * BEDROOM MATCH
   * ----------------------------------------------------- */

  const requestedBedrooms =
    rvRequestedBedrooms(context);

  const opportunityBedrooms =
    rvBedrooms(opportunity);

  let bedroomsMatch = null;

  if (
    requestedBedrooms !== null &&
    opportunityBedrooms !== null
  ) {

    bedroomsMatch =
      opportunityBedrooms === requestedBedrooms;

    factors.push(
      bedroomsMatch
        ? "bedroom-match"
        : "bedroom-mismatch"
    );
  }


  /* -------------------------------------------------------
   * BUDGET COMPATIBILITY
   * ----------------------------------------------------- */

  const budget =
    rvBudget(context);

  const price =
    rvPrice(opportunity);

  let budgetCompatible = null;

  if (
    budget !== null &&
    price !== null
  ) {

    budgetCompatible =
      price <= budget;

    factors.push(
      budgetCompatible
        ? "budget-match"
        : "budget-exceeded"
    );
  }


  /* -------------------------------------------------------
   * VIEWING-TIME COMPATIBILITY
   * ----------------------------------------------------- */

  const requestedTime =
    rvRequestedTime(context);

  const duration =
    rvDuration(opportunity);

  let timeCompatible = null;
  let timeScore = null;

  if (
    requestedTime !== null &&
    duration !== null
  ) {

    timeCompatible =
      duration <= requestedTime;

    timeScore =
      timeCompatible
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (
                  1 -
                  duration /
                  requestedTime
                ) * 100
              )
            )
          )
        : 0;

    factors.push(
      timeCompatible
        ? "time-match"
        : "time-exceeded"
    );
  }


  /* -------------------------------------------------------
   * AFFORDABILITY
   * ----------------------------------------------------- */

  const wantsAffordable =
    context.wantsAffordable === true ||
    context.intent?.wantsAffordable === true ||
    context.wantsBudgetOptimization === true ||
    context.intent?.wantsBudgetOptimization === true;


  let affordabilityScore = null;

  if (
    wantsAffordable &&
    price !== null
  ) {

    if (budget !== null) {

      affordabilityScore =
        price <= budget
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (
                    1 -
                    price /
                    budget
                  ) * 100
                )
              )
            )
          : 0;

    } else {

      /*
       * No numeric budget was supplied.
       *
       * We deliberately leave the score null.
       * The ranking/scoring layer can compare raw
       * prices between opportunities.
       */

      affordabilityScore = null;

      factors.push(
        "affordability-optimization"
      );
    }
  }


  /* -------------------------------------------------------
   * RETURN ENRICHED OPPORTUNITY
   * ----------------------------------------------------- */

  enriched.bedroomsMatch =
    bedroomsMatch;

  enriched.budgetCompatible =
    budgetCompatible ?? opportunity.budgetCompatible ?? null;

  enriched.timeCompatible =
    timeCompatible ?? opportunity.timeCompatible ?? null;

  enriched.affordabilityScore =
    affordabilityScore;

  enriched.timeScore =
    timeScore;

  enriched.reasoningFactors =
    factors;


  return enriched;
    }

/**
 * Ride2View Lifestyle Agent
 * AI Reasoning Engine
 *
 * Purpose:
 * Interprets normalized context and discovered opportunities.
 *
 * Current implementation:
 * Deterministic reasoning foundation.
 *
 * The reasoning engine enriches opportunities with:
 *
 * - reasoningScore
 * - reasoningFactors
 * - reasoningExplanation
 *
 * An external LLM can be connected later
 * through a model adapter.
 */


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


  const goal =
    context.goal ||
    context.userGoal ||
    context.intent?.userGoal ||
    null;


  const location =
    context.location || {};


  const budget =
    context.budget ??
    context.intent?.budget ??
    null;


  const availableTime =
    context.availableTime ??
    context.intent?.availableTime ??
    null;


  const currentActivity =
    context.currentActivity ||
    null;


  const destination =
    context.destination ||
    null;


  const budgetOptimization =
    context.wantsBudgetOptimization === true ||
    context.intent?.wantsBudgetOptimization === true ||
    context.constraints?.budgetOptimization === true;


  const wantsAffordable =
    context.wantsAffordable === true ||
    context.intent?.wantsAffordable === true ||
    context.constraints?.affordable === true;


  const reasoning = [];


  /* =======================================================
     REASON ABOUT EACH OPPORTUNITY
     ======================================================= */

  opportunities.forEach(
    (rawOpportunity) => {

      const opportunity = enrichOpportunityReasoning(context, rawOpportunity);

      let priority = 0;

      const factors = [];


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
         DESTINATION SIGNAL
         ===================================================== */

      if (
        destination &&
        opportunity.type === "mobility"
      ) {

        priority += 25;

        factors.push(
          "destination-present"
        );
      }


      /* =====================================================
         LOCATION SIGNAL
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
         TIME SIGNAL
         ===================================================== */

      if (
        availableTime !== null
      ) {

        if (
          opportunity.timeCompatible === true
        ) {

          priority += 20;

          factors.push(
            "time-context"
          );

        } else if (opportunity.timeCompatible === false) {

          priority -= 20;

          factors.push(
            "time-conflict"
          );
        }
      }


      /* =====================================================
         BUDGET SIGNAL
         ===================================================== */

      if (
        budget !== null
      ) {

        if (
          opportunity.budgetCompatible === true
        ) {

          priority += 20;

          factors.push(
            "budget-context"
          );

        } else if (opportunity.budgetCompatible === false) {

          /*
           * Do not destroy the opportunity.
           *
           * An over-budget property can still be
           * useful as an alternative.
           */

          priority -= 5;

          factors.push(
            "budget-exceeded"
          );
        }
      }


      /* =====================================================
         BUDGET OPTIMIZATION
         ===================================================== */

      if (
        budgetOptimization &&
        typeof opportunity.price === "number"
      ) {

        if (
          budget !== null &&
          opportunity.price <= budget
        ) {

          priority += 30;

          factors.push(
            "budget-optimization-match"
          );

        } else {

          /*
           * Penalize expensive options when the
           * user explicitly requested optimization.
           */

          priority -= 10;

          factors.push(
            "budget-optimization-conflict"
          );
        }
      }


      /* =====================================================
         AFFORDABILITY
         ===================================================== */

      if (
        wantsAffordable &&
        typeof opportunity.price === "number"
      ) {

        if (
          budget !== null &&
          opportunity.price <= budget
        ) {

          priority += 20;

          factors.push(
            "affordability-match"
          );

        } else {

          priority -= 5;

          factors.push(
            "affordability-conflict"
          );
        }
      }


      /* =====================================================
         ACTIVITY SIGNAL
         ===================================================== */

      if (
        currentActivity &&
        opportunity.type === "mobility"
      ) {

        priority += 10;

        factors.push(
          "activity-context"
        );
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

      const enrichedOpportunity = enrichOpportunityReasoning(context, {

        ...opportunity,

        reasoningScore:
          Math.max(
            0,
            Math.round(priority)
          ),

        reasoningFactors:
          factors,

        reasoningExplanation:
          explanation

      });


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

  reasonAboutOpportunities,
  enrichOpportunityReasoning,
  minutes

};

