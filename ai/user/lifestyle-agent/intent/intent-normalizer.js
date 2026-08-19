/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Normalizer
 *
 * Converts raw parser output into a stable intent schema.
 */

function normalizeIntent(rawIntent = {}) {

  const intent = {

    wantsProperty:
      Boolean(rawIntent.wantsProperty),

    wantsMobility:
      Boolean(rawIntent.wantsMobility),

    wantsFood:
      Boolean(rawIntent.wantsFood),

    wantsShopping:
      Boolean(rawIntent.wantsShopping),

    wantsStudent:
      Boolean(rawIntent.wantsStudent),

    wantsWomenOnly:
      Boolean(rawIntent.wantsWomenOnly),

    wantsVIP:
      Boolean(rawIntent.wantsVIP),

    wantsPremium:
      Boolean(rawIntent.wantsPremium),

    wantsAffordable:
      Boolean(rawIntent.wantsAffordable),

    wantsBudgetOptimization:
      Boolean(rawIntent.wantsBudgetOptimization),

    bedrooms:
      rawIntent.bedrooms || null,

    location:
      rawIntent.location || null,

    budget:
      rawIntent.budget || null,

    rawMessage:
      rawIntent.rawMessage || ""
  };


  /*
   * ---------------------------------------------------------
   * SEGMENT RESOLUTION
   * ---------------------------------------------------------
   *
   * Priority matters.
   */

  let segment = "general";


  if (intent.wantsWomenOnly) {

    segment = "women-only";

  }

  else if (intent.wantsStudent) {

    segment = "student";

  }

  else if (intent.wantsVIP || intent.wantsPremium) {

    segment = "vip";

  }


  intent.segment = segment;


  /*
   * ---------------------------------------------------------
   * IMPLIED INTENT
   * ---------------------------------------------------------
   */

  if (intent.wantsStudent) {

    intent.wantsProperty = true;

  }


  if (intent.wantsPremium) {

    intent.wantsProperty = true;

  }


  if (intent.wantsWomenOnly) {

    intent.wantsMobility = true;

  }


  /*
   * Affordability is generally property-oriented
   * in the Lifestyle Agent.
   */

  if (intent.wantsAffordable) {

    intent.wantsProperty = true;

  }


  return intent;
}


module.exports = {
  normalizeIntent
};
