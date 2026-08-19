/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Parser
 *
 * Converts a natural-language request into raw intent signals.
 */

function parseIntent(message = "") {

  const text = String(message)
    .toLowerCase()
    .trim();

  const intent = {

    wantsProperty: false,
    wantsMobility: false,
    wantsFood: false,
    wantsShopping: false,

    wantsStudent: false,
    wantsWomenOnly: false,
    wantsVIP: false,
    wantsPremium: false,

    wantsAffordable: false,
    wantsBudgetOptimization: false,

    bedrooms: null,

    location: null,

    budget: null,

    rawMessage: text
  };


  /*
   * ---------------------------------------------------------
   * PROPERTY
   * ---------------------------------------------------------
   */

  if (
    /property|house|home|apartment|villa|bungalow|mansion|accommodation|housing|rent|rental|bedroom/i
      .test(text)
  ) {
    intent.wantsProperty = true;
  }


  /*
   * ---------------------------------------------------------
   * MOBILITY
   * ---------------------------------------------------------
   */

  if (
    /transport|transportation|ride|taxi|cab|driver|pickup|pick-up|get there|take me|travel|mobility/i
      .test(text)
  ) {
    intent.wantsMobility = true;
  }


  /*
   * ---------------------------------------------------------
   * FOOD
   * ---------------------------------------------------------
   */

  if (
    /food|restaurant|meal|lunch|dinner|breakfast|eat|eating|delivery/i
      .test(text)
  ) {
    intent.wantsFood = true;
  }


  /*
   * ---------------------------------------------------------
   * SHOPPING
   * ---------------------------------------------------------
   */

  if (
    /shop|shopping|buy|purchase|marketplace|product|goods/i
      .test(text)
  ) {
    intent.wantsShopping = true;
  }


  /*
   * ---------------------------------------------------------
   * STUDENT
   * ---------------------------------------------------------
   */

  if (
    /student|students|campus|university|college|hostel|student accommodation|student housing/i
      .test(text)
  ) {
    intent.wantsStudent = true;
    intent.wantsProperty = true;
  }


  /*
   * ---------------------------------------------------------
   * WOMEN ONLY
   * ---------------------------------------------------------
   */

  if (
    /women-only|women only|female-only|female only|ladies-only|ladies only/i
      .test(text)
  ) {
    intent.wantsWomenOnly = true;
    intent.wantsMobility = true;
  }


  /*
   * ---------------------------------------------------------
   * VIP / PREMIUM
   * ---------------------------------------------------------
   */

  if (
    /\bvip\b|executive|exclusive|first class|luxury|premium|high-end|high end/i
      .test(text)
  ) {
    intent.wantsVIP =
      /\bvip\b|executive|exclusive|first class/i.test(text);

    intent.wantsPremium = true;

    /*
     * Luxury/premium normally refers to property in the
     * current Lifestyle Agent context.
     */
    if (
      /luxury|premium property|premium apartment|luxury property|villa|mansion/i
        .test(text)
    ) {
      intent.wantsProperty = true;
    }
  }


  /*
   * ---------------------------------------------------------
   * AFFORDABILITY
   * ---------------------------------------------------------
   */

  if (
    /affordable|cheapest|cheap|budget|most affordable|lowest price|low cost|save money/i
      .test(text)
  ) {
    intent.wantsAffordable = true;
    intent.wantsBudgetOptimization = true;
  }


  /*
   * ---------------------------------------------------------
   * BEDROOMS
   * ---------------------------------------------------------
   */

  const bedroomMatch =
    text.match(
      /(\d+)\s*(?:bedroom|bedrooms|br)\b/i
    );

  if (bedroomMatch) {

    intent.bedrooms =
      Number(bedroomMatch[1]);

    intent.wantsProperty = true;
  }


  /*
   * ---------------------------------------------------------
   * BUDGET
   * ---------------------------------------------------------
   *
   * Supports:
   * KSH 30000
   * KES 30,000
   * 30000
   * 30k
   */

  const budgetMatch =
    text.match(
      /(?:ksh|kes|sh|budget)\s*([\d,]+(?:\.\d+)?)(k)?/i
    );

  if (budgetMatch) {

    let amount =
      Number(
        budgetMatch[1].replace(/,/g, "")
      );

    if (
      budgetMatch[2]
    ) {
      amount *= 1000;
    }

    intent.budget = amount;
  }


  /*
   * ---------------------------------------------------------
   * LOCATION
   * ---------------------------------------------------------
   */

  const knownLocations = [
    "nairobi",
    "westlands",
    "kilimani",
    "lavington",
    "karen",
    "kileleshwa",
    "kasarani",
    "rongai",
    "mombasa",
    "kisumu"
  ];

  for (const location of knownLocations) {

    if (
      text.includes(location)
    ) {

      intent.location = location;

      break;
    }
  }


  /*
   * ---------------------------------------------------------
   * VIEWING / TIME
   * ---------------------------------------------------------
   */

  if (
    /view|viewing|visit|see the property|within one hour|1 hour|60 minutes/i
      .test(text)
  ) {
    intent.wantsProperty = true;
  }


  return intent;
}


module.exports = {
  parseIntent
};
