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

  /*
   * Support both:
   *
   * context.goal
   * context.userGoal
   *
   * This makes the reasoning engine resilient
   * to different context-normalization stages.
   */

  const goal =
    context.goal ||
    context.userGoal ||
    null;

  const location =
    context.location || {};

  const budget =
    context.budget ??
    null;

  const availableTime =
    context.availableTime ??
    null;

  const currentActivity =
    context.currentActivity ||
    null;

  const destination =
    context.destination ||
    null;


  /*
   * ==========================================
   * REASON ABOUT EACH OPPORTUNITY
   * ==========================================
   */

  opportunities.forEach(
    (opportunity) => {

      let priority = 0;

      const factors = [];


      /*
       * ========================================
       * GOAL ALIGNMENT
       * ========================================
       */

      if (
        goal &&
        (
          opportunity.type === goal ||
          opportunity.category === goal
        )
      ) {

        priority += 30;

        factors.push(
          "goal-alignment"
        );

      }


      /*
       * ========================================
       * DESTINATION SIGNAL
       * ========================================
       */

      if (
        destination &&
        opportunity.type === "mobility"
      ) {

        priority += 25;

        factors.push(
          "destination-present"
        );

      }


      /*
       * ========================================
       * LOCATION SIGNAL
       * ========================================
       */

      if (
        location?.city &&
        opportunity.locationMatch === true
      ) {

        priority += 15;

        factors.push(
          "location-context"
        );

      }


      /*
       * ========================================
       * TIME SIGNAL
       * ========================================
       */

      if (
        availableTime !== null &&
        opportunity.timeCompatible === true
      ) {

        priority += 10;

        factors.push(
          "time-context"
        );

      }


      /*
       * ========================================
       * BUDGET SIGNAL
       * ========================================
       */

      if (
        budget !== null &&
        opportunity.budgetCompatible === true
      ) {

        priority += 10;

        factors.push(
          "budget-context"
        );

      }


      /*
       * ========================================
       * ACTIVITY SIGNAL
       * ========================================
       */

      if (
        currentActivity &&
        opportunity.type === "mobility"
      ) {

        priority += 10;

        factors.push(
          "activity-context"
        );

      }


      /*
       * ========================================
       * STORE REASONING
       * ========================================
       */

      reasoning.push({

        opportunity,

        reasoningScore:
          priority,

        factors

      });

    }
  );


  /*
   * ==========================================
   * SORT BY REASONING SCORE
   * ==========================================
   */

  return reasoning.sort(
    (a, b) => {

      if (
        b.reasoningScore !==
        a.reasoningScore
      ) {

        return (
          b.reasoningScore -
          a.reasoningScore
        );

      }


      /*
       * Stable secondary ordering.
       */

      const idA =
        String(
          a.opportunity?.id || ""
        );

      const idB =
        String(
          b.opportunity?.id || ""
        );

      return idA.localeCompare(
        idB
      );

    }
  );

}


/*
 * ==========================================
 * EXPORT
 * ==========================================
 */

module.exports = {

  reasonAboutOpportunities

};
