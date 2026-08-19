/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Normalizer
 *
 * Converts raw parser output into a stable,
 * segment-aware intent schema.
 */

function normalizeIntent(rawIntent = {}) {

  const intent = {

    // Core service intents
    wantsProperty: Boolean(rawIntent.wantsProperty),
    wantsMobility: Boolean(rawIntent.wantsMobility),
    wantsFood: Boolean(rawIntent.wantsFood),
    wantsShopping: Boolean(rawIntent.wantsShopping),

    // User segments
    wantsStudent: Boolean(rawIntent.wantsStudent),
    wantsWomenOnly: Boolean(rawIntent.wantsWomenOnly),
    wantsVIP: Boolean(rawIntent.wantsVIP),
    wantsPremium: Boolean(rawIntent.wantsPremium),

    // Optimization signals
    wantsAffordable: Boolean(rawIntent.wantsAffordable),
    wantsBudgetOptimization:
      Boolean(rawIntent.wantsBudgetOptimization),

    // Structured constraints
    bedrooms:
      rawIntent.bedrooms !== undefined &&
      rawIntent.bedrooms !== null
        ? Number(rawIntent.bedrooms)
        : null,

    location:
      rawIntent.location || null,

    budget:
      rawIntent.budget !== undefined &&
      rawIntent.budget !== null
        ? Number(rawIntent.budget)
        : null,

    rawMessage:
      rawIntent.rawMessage || ""
  };


  /*
   * =========================================================
   * IMPLIED INTENT
   * =========================================================
   */

  /*
   * Students searching for accommodation
   * necessarily imply property intent.
   */
  if (intent.wantsStudent) {
    intent.wantsProperty = true;
  }


  /*
   * Premium/luxury requests imply property intent
   * when used in the property context.
   */
  if (intent.wantsPremium) {
    intent.wantsProperty = true;
  }


  /*
   * Women-only is currently a mobility segment
   * in Ride2View.
   */
  if (intent.wantsWomenOnly) {
    intent.wantsMobility = true;
  }


  /*
   * Affordability is primarily useful for
   * property discovery.
   */
  if (intent.wantsAffordable) {
    intent.wantsProperty = true;
  }


  /*
   * Budget optimization also implies property
   * discovery when a housing/property request exists.
   */
  if (intent.wantsBudgetOptimization) {
    intent.wantsProperty = true;
  }


  /*
   * =========================================================
   * SEGMENT RESOLUTION
   * =========================================================
   *
   * "segment" represents the PRIMARY segment.
   *
   * Priority:
   *
   * women-only
   *      ↓
   * student
   *      ↓
   * vip
   *      ↓
   * general
   */

  let segment = "general";


  if (intent.wantsWomenOnly) {

    segment = "women-only";

  } else if (intent.wantsStudent) {

    segment = "student";

  } else if (
    intent.wantsVIP ||
    intent.wantsPremium
  ) {

    segment = "vip";

  }


  intent.segment = segment;


  /*
   * =========================================================
   * ALL ACTIVE SEGMENTS
   * =========================================================
   *
   * Important:
   * A user can belong to more than one operational
   * segment at the same time.
   */

  const segments = [];


  if (
    intent.wantsStudent
  ) {
    segments.push("student");
  }


  if (
    intent.wantsWomenOnly
  ) {
    segments.push("women-only");
  }


  if (
    intent.wantsVIP
  ) {
    segments.push("vip");
  }


  if (
    intent.wantsPremium
  ) {
    segments.push("premium");
  }


  if (
    segments.length === 0
  ) {
    segments.push("general");
  }


  intent.segments = segments;


  /*
   * =========================================================
   * SERVICE REQUIREMENTS
   * =========================================================
   *
   * This gives downstream discovery a clean contract.
   */

  const services = [];


  if (intent.wantsProperty) {
    services.push("property");
  }


  if (intent.wantsMobility) {
    services.push("mobility");
  }


  if (intent.wantsFood) {
    services.push("food");
  }


  if (intent.wantsShopping) {
    services.push("shopping");
  }


  intent.services = services;


  /*
   * =========================================================
   * CONSTRAINTS
   * =========================================================
   */

  intent.constraints = {

    bedrooms:
      intent.bedrooms,

    location:
      intent.location,

    budget:
      intent.budget,

    affordable:
      intent.wantsAffordable,

    budgetOptimization:
      intent.wantsBudgetOptimization
  };


  /*
   * =========================================================
   * DISCOVERY FLAGS
   * =========================================================
   *
   * These flags make the intent explicit for
   * opportunity-discovery.js.
   */

  intent.discovery = {

    property:
      intent.wantsProperty,

    mobility:
      intent.wantsMobility,

    food:
      intent.wantsFood,

    shopping:
      intent.wantsShopping,

    student:
      intent.wantsStudent,

    womenOnly:
      intent.wantsWomenOnly,

    premium:
      intent.wantsPremium,

    vip:
      intent.wantsVIP,

    affordable:
      intent.wantsAffordable,

    budgetOptimization:
      intent.wantsBudgetOptimization
  };


  return intent;
}


module.exports = {
  normalizeIntent
};
