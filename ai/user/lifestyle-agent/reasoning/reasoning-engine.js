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


function rvRequestedTime(context = {}) {
  return rvNumber(
    context.maxViewingTime ??
    context.availableTime ??
    context.intent?.maxViewingTime ??
    context.constraints?.maxViewingTime
  );
}


function rvDuration(opportunity = {}) {
  return rvNumber(
    opportunity.timing?.duration ??
    opportunity.duration ??
    opportunity.availableTime ??
    opportunity.maxViewingTime
  );
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
    budgetCompatible;

  enriched.timeCompatible =
    timeCompatible;

  enriched.affordabilityScore =
    affordabilityScore;

  enriched.timeScore =
    timeScore;

  enriched.reasoningFactors =
    factors;


  return enriched;
    }
