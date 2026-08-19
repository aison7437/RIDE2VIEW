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
    (opportunity) => {

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

        } else {

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

        } else {

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

      const enrichedOpportunity = {

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
