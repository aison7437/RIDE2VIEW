/**
 * ============================================================
 * RIDE2VIEW LIFESTYLE AGENT
 * OPPORTUNITY DISCOVERY ENGINE
 * ============================================================
 *
 * Responsibilities:
 *
 * 1. Extract the user's actual request
 * 2. Detect lifestyle intent
 * 3. Discover relevant properties
 * 4. Discover mobility when requested
 * 5. Support student / premium / women-only scenarios
 * 6. Attach contextual compatibility signals
 * 7. Preserve the discoverOpportunities() contract
 *
 * Export:
 *
 * module.exports = {
 *   discoverOpportunities
 * }
 *
 * ============================================================
 */


/* ============================================================
   DATASET
============================================================ */

const PROPERTY_DATASET = [

  {
    id: "property-001",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "2 Bedroom Apartment - Kilimani",

    description:
      "Modern 2 bedroom apartment suitable for residential living in Nairobi.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 45000,

    availability:
      "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "85 sqm"
    },

    tags: [
      "property",
      "2 bedroom",
      "kilimani",
      "residential"
    ]
  },


  {
    id: "property-002",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "3 Bedroom Apartment - Westlands",

    description:
      "Spacious 3 bedroom apartment in Westlands, Nairobi.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 55000,

    availability:
      "available",

    property: {
      propertyType: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      area: "120 sqm"
    },

    tags: [
      "property",
      "3 bedroom",
      "westlands",
      "spacious"
    ]
  },


  {
    id: "property-003",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "1 Bedroom Apartment - Kilimani",

    description:
      "Affordable 1 bedroom apartment in Kilimani, Nairobi.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 35000,

    availability:
      "available",

    property: {
      propertyType: "apartment",
      bedrooms: 1,
      bathrooms: 1,
      area: "55 sqm"
    },

    tags: [
      "property",
      "1 bedroom",
      "kilimani",
      "affordable"
    ]
  },


  {
    id: "property-004",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "2 Bedroom Apartment - Lavington",

    description:
      "Comfortable 2 bedroom apartment in Lavington, Nairobi.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 60000,

    availability:
      "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "95 sqm"
    },

    tags: [
      "property",
      "2 bedroom",
      "lavington",
      "comfortable"
    ]
  },


  {
    id: "property-005",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "Luxury Villa - Karen",

    description:
      "Premium luxury villa in Karen, Nairobi with spacious living areas.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 250000,

    availability:
      "available",

    property: {
      propertyType: "villa",
      bedrooms: 5,
      bathrooms: 4,
      area: "420 sqm"
    },

    tags: [
      "property",
      "luxury",
      "premium",
      "villa",
      "mansion",
      "karen"
    ]
  },


  {
    id: "property-006",
    type: "property",
    category: "property",
    service: "property-search",

    title:
      "Student Studio - Kilimani",

    description:
      "Affordable student-friendly studio accommodation in Kilimani, Nairobi.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 25000,

    availability:
      "available",

    property: {
      propertyType: "studio",
      bedrooms: 1,
      bathrooms: 1,
      area: "30 sqm"
    },

    tags: [
      "property",
      "student",
      "student-friendly",
      "student accommodation",
      "studio",
      "affordable",
      "kilimani"
    ]
  }

];


/* ============================================================
   MOBILITY DATASET
============================================================ */

const MOBILITY_DATASET = [

  {
    id: "ride-service",
    type: "mobility",
    category: "mobility",
    service: "ride",

    title:
      "Ride Service",

    description:
      "Arrange transportation to support the user's property viewing journey.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    availability:
      "available",

    tags: [
      "transport",
      "transportation",
      "mobility",
      "ride",
      "property viewing"
    ]
  },


  {
    id: "women-only-ride",
    type: "mobility",
    category: "mobility",
    service: "ride",

    title:
      "Women-Only Ride",

    description:
      "Women-only transportation option for a safer and more comfortable property viewing journey.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    availability:
      "available",

    tags: [
      "transport",
      "mobility",
      "ride",
      "women-only",
      "women only",
      "female",
      "property viewing"
    ],

    womenOnly:
      true
  }

];


/* ============================================================
   SAFE TEXT NORMALIZATION
============================================================ */

function normalizeText(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}


/* ============================================================
   REQUEST EXTRACTION
============================================================ */

function extractRequestMessage(context = {}) {

  if (
    !context ||
    typeof context !== "object"
  ) {
    return "";
  }

  const candidates = [

    context?.request?.message,

    context?.message,

    context?.userRequest?.message,

    context?.input?.message,

    context?.query

  ];

  for (
    const candidate of candidates
  ) {

    if (
      typeof candidate === "string" &&
      candidate.trim().length > 0
    ) {

      return candidate.trim();

    }

  }

  return "";

}


/* ============================================================
   SEARCH TEXT
============================================================ */

function buildSearchText(context = {}) {

  const requestMessage =
    extractRequestMessage(context);

  const userGoal =
    normalizeText(
      context?.userGoal
    );

  const preferences =
    Array.isArray(
      context?.user?.preferences
    )
      ? context.user.preferences.join(" ")
      : "";

  const city =
    normalizeText(
      context?.location?.city
    );

  const country =
    normalizeText(
      context?.location?.country
    );

  return normalizeText(

    [
      requestMessage,
      userGoal,
      preferences,
      city,
      country
    ]

      .filter(Boolean)

      .join(" ")

  );

}


/* ============================================================
   INTENT DETECTION
============================================================ */

function detectIntent(context = {}) {

  const searchText =
    buildSearchText(context);


  const wantsStudent =
    /\bstudent\b|\bstudents\b|student accommodation|student housing|student-friendly|campus/i
      .test(searchText);


  const wantsPremium =
    /\bluxury\b|\bpremium\b|\bhigh-end\b|\bupscale\b|\bvilla\b|\bmansion\b/i
      .test(searchText);


  const wantsWomenOnly =
    /women-only|women only|female-only|female only|for women|women transport|women ride/i
      .test(searchText);


  const wantsMobility =
    /\btransport\b|\btransportation\b|\bmobility\b|\bget me there\b|\bget there\b|\bride\b|\btaxi\b|\bdriver\b/i
      .test(searchText);


  const wantsProperty =
    /\bproperty\b|\bhouse\b|\bhome\b|\bapartment\b|\baccommodation\b|\brent\b|\bhousing\b|\bvilla\b|\bmansion\b/i
      .test(searchText)
      ||
      normalizeText(
        context?.userGoal
      ) === "property";


  const wantsAffordable =
    /\baffordable\b|\bcheapest\b|\bcheap\b|\bmost affordable\b|\bbudget\b/i
      .test(searchText);


  const bedroomMatch =
    searchText.match(
      /(\d+)\s*[- ]?\s*bed(room|rooms)?/i
    );


  const bedrooms =
    bedroomMatch
      ? Number(
          bedroomMatch[1]
        )
      : null;


  return {

    searchText,

    wantsProperty,

    wantsStudent,

    wantsPremium,

    wantsWomenOnly,

    wantsMobility,

    wantsAffordable,

    bedrooms

  };

}


/* ============================================================
   LOCATION MATCH
============================================================ */

function matchesLocation(
  item = {},
  context = {},
  searchText = ""
) {

  const requestedCity =
    normalizeText(
      context?.location?.city
    );


  /*
   * If no city was provided,
   * do not reject the opportunity.
   */

  if (!requestedCity) {
    return true;
  }


  const itemCity =
    normalizeText(
      item?.location?.city
    );


  if (
    itemCity === requestedCity
  ) {
    return true;
  }


  return searchText.includes(
    itemCity
  );

}


/* ============================================================
   PROPERTY RELEVANCE
============================================================ */

function propertyMatchesIntent(
  property = {},
  context = {},
  intent = {}
) {

  const searchText =
    intent.searchText || "";


  const title =
    normalizeText(
      property.title
    );


  const description =
    normalizeText(
      property.description
    );


  const tags =
    Array.isArray(property.tags)
      ? property.tags.join(" ")
      : "";


  /*
   * FIX:
   *
   * The original implementation contained:
   *
   * ${title} ${description} ${tags}
   *
   * without a template literal.
   *
   * This is now correctly constructed.
   */

  const propertyText =
    normalizeText(
      `${title} ${description} ${tags}`
    );


  /* ----------------------------------------------------------
     STUDENT
  ---------------------------------------------------------- */

  if (
    intent.wantsStudent &&
    !(
      propertyText.includes("student") ||
      propertyText.includes("student-friendly") ||
      propertyText.includes("student accommodation")
    )
  ) {

    return false;

  }


  /* ----------------------------------------------------------
     PREMIUM
  ---------------------------------------------------------- */

  if (
    intent.wantsPremium &&
    !(
      propertyText.includes("luxury") ||
      propertyText.includes("premium") ||
      propertyText.includes("villa") ||
      propertyText.includes("mansion")
    )
  ) {

    return false;

  }


  /* ----------------------------------------------------------
     BEDROOMS
  ---------------------------------------------------------- */

  if (
    intent.bedrooms !== null &&
    Number(
      property?.property?.bedrooms
    ) !== intent.bedrooms
  ) {

    return false;

  }


  /* ----------------------------------------------------------
     NEIGHBORHOOD
  ---------------------------------------------------------- */

  const requestedNeighborhoods = [

    "westlands",
    "kilimani",
    "lavington",
    "karen"

  ];


  for (
    const neighborhood
    of requestedNeighborhoods
  ) {

    if (
      searchText.includes(
        neighborhood
      )
    ) {

      if (
        !propertyText.includes(
          neighborhood
        )
      ) {

        return false;

      }

      break;

    }

  }


  return true;

}


/* ============================================================
   PROPERTY SCORING
============================================================ */

function scoreProperty(
  property = {},
  context = {},
  intent = {}
) {

  let score = 0;


  const budget =
    Number(
      context?.budget
    );


  const price =
    Number(
      property?.price
    );


  const propertyText =
    normalizeText(

      [
        property.title,
        property.description,
        ...(Array.isArray(property.tags)
          ? property.tags
          : [])

      ].join(" ")

    );


  /* ----------------------------------------------------------
     BASE PROPERTY RELEVANCE
  ---------------------------------------------------------- */

  if (
    intent.wantsProperty
  ) {

    score += 30;

  }


  /* ----------------------------------------------------------
     LOCATION
  ---------------------------------------------------------- */

  if (
    matchesLocation(
      property,
      context,
      intent.searchText
    )
  ) {

    score += 25;

  }


  /* ----------------------------------------------------------
     BUDGET
  ---------------------------------------------------------- */

  if (
    Number.isFinite(budget) &&
    Number.isFinite(price)
  ) {

    if (
      price <= budget
    ) {

      score += 25;

    } else {

      const ratio =
        budget / price;

      score += Math.max(
        0,
        Math.min(
          15,
          ratio * 15
        )
      );

    }

  }


  /* ----------------------------------------------------------
     STUDENT
  ---------------------------------------------------------- */

  if (
    intent.wantsStudent
  ) {

    if (
      propertyText.includes(
        "student"
      )
    ) {

      score += 40;

    }

  }


  /* ----------------------------------------------------------
     PREMIUM
  ---------------------------------------------------------- */

  if (
    intent.wantsPremium
  ) {

    if (

      propertyText.includes("luxury") ||
      propertyText.includes("premium") ||
      propertyText.includes("villa") ||
      propertyText.includes("mansion")

    ) {

      score += 40;

    }

  }


  /* ----------------------------------------------------------
     BEDROOMS
  ---------------------------------------------------------- */

  if (
    intent.bedrooms !== null &&
    Number(
      property?.property?.bedrooms
    ) === intent.bedrooms
  ) {

    score += 40;

  }


  /* ----------------------------------------------------------
     AFFORDABILITY
  ---------------------------------------------------------- */

  if (
    intent.wantsAffordable
  ) {

    const affordableScore =
      Number.isFinite(price)

        ? Math.max(
            0,
            20 -
              (
                price /
                Math.max(
                  budget || price,
                  1
                )
              ) *
              10
          )

        : 0;


    score +=
      affordableScore;

  }


  return Math.round(
    Math.min(
      100,
      score
    )
  );

}


/* ============================================================
   MOBILITY SCORING
============================================================ */

function scoreMobility(
  mobility = {},
  context = {},
  intent = {}
) {

  let score = 0;


  if (
    intent.wantsMobility
  ) {

    score += 60;

  }


  if (
    intent.wantsWomenOnly
  ) {

    if (
      mobility.womenOnly === true
    ) {

      score += 40;

    } else {

      score -= 30;

    }

  }


  if (
    matchesLocation(
      mobility,
      context,
      intent.searchText
    )
  ) {

    score += 20;

  }


  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );

}


/* ============================================================
   FORMAT PROPERTY
============================================================ */

function formatProperty(
  property = {},
  context = {},
  intent = {}
) {

  const score =
    scoreProperty(
      property,
      context,
      intent
    );


  const budget =
    Number(
      context?.budget
    );


  const price =
    Number(
      property.price
    );


  return {

    ...property,

    budget:
      Number.isFinite(budget)
        ? budget
        : null,

    availableTime:
      context?.availableTime ||
      null,

    relevance:
      score >= 70
        ? "high"
        : score >= 45
          ? "medium"
          : "low",

    locationMatch:
      matchesLocation(
        property,
        context,
        intent.searchText
      ),

    budgetCompatible:
      Number.isFinite(budget) &&
      Number.isFinite(price)
        ? price <= budget
        : null,

    timeCompatible:
      true,

    preferenceMatch:
      intent.wantsStudent
        ? (
            Array.isArray(
              property.tags
            ) &&
            property.tags.some(
              tag =>
                normalizeText(tag)
                  .includes("student")
            )
          )
        : true,

    source:
      "property-dataset",

    createdAt:
      new Date().toISOString(),

    reasoningScore:
      score

  };

}


/* ============================================================
   FORMAT MOBILITY
============================================================ */

function formatMobility(
  mobility = {},
  context = {},
  intent = {}
) {

  const score =
    scoreMobility(
      mobility,
      context,
      intent
    );


  const numericBudget =
    Number(
      context?.budget
    );


  return {

    ...mobility,

    budget:
      Number.isFinite(
        numericBudget
      )
        ? numericBudget
        : null,

    availableTime:
      context?.availableTime ||
      null,

    locationMatch:
      matchesLocation(
        mobility,
        context,
        intent.searchText
      ),

    timeCompatible:
      true,

    preferenceMatch:
      intent.wantsWomenOnly
        ? mobility.womenOnly === true
        : true,

    source:
      "ride2view",

    createdAt:
      new Date().toISOString(),

    reasoningScore:
      score,

    womenOnly:
      mobility.womenOnly === true

  };

}


/* ============================================================
   DISCOVER OPPORTUNITIES
============================================================ */

async function discoverOpportunities(
  context = {}
) {

  const intent =
    detectIntent(
      context
    );


  console.log(
    "[Lifestyle Discovery] Search text:",
    intent.searchText
  );


  console.log(
    "[Lifestyle Discovery] Intent:",
    {
      wantsStudent:
        intent.wantsStudent,

      wantsPremium:
        intent.wantsPremium,

      wantsWomenOnly:
        intent.wantsWomenOnly,

      wantsMobility:
        intent.wantsMobility,

      wantsProperty:
        intent.wantsProperty,

      wantsAffordable:
        intent.wantsAffordable,

      bedrooms:
        intent.bedrooms
    }
  );


  /* ========================================================
     PROPERTY DISCOVERY
  ======================================================== */

  let properties =
    PROPERTY_DATASET.filter(
      property =>
        matchesLocation(
          property,
          context,
          intent.searchText
        )
    );


  /*
   * Apply explicit property intent.
   *
   * Student / premium / bedroom searches
   * narrow discovery.
   */

  if (
    intent.wantsStudent ||
    intent.wantsPremium ||
    intent.bedrooms !== null
  ) {

    const targeted =
      properties.filter(
        property =>
          propertyMatchesIntent(
            property,
            context,
            intent
          )
      );


    /*
     * Only replace the broad result set when
     * targeted discovery actually finds matches.
     *
     * This prevents accidental empty results.
     */

    if (
      targeted.length > 0
    ) {

      properties =
        targeted;

    }

  }


  /* ========================================================
     MOBILITY DISCOVERY
  ======================================================== */

  let mobility = [];


  if (
    intent.wantsMobility
  ) {

    mobility =
      MOBILITY_DATASET.filter(
        item => {

          if (
            intent.wantsWomenOnly
          ) {

            return (
              item.womenOnly === true
            );

          }

          return true;

        }
      );

  }


  /* ========================================================
     FORMAT RESULTS
  ======================================================== */

  const propertyResults =
    properties.map(
      property =>
        formatProperty(
          property,
          context,
          intent
        )
    );


  const mobilityResults =
    mobility.map(
      item =>
        formatMobility(
          item,
          context,
          intent
        )
    );


  /* ========================================================
     SORT
  ======================================================== */

  propertyResults.sort(
    (a, b) =>
      b.reasoningScore -
      a.reasoningScore
  );


  mobilityResults.sort(
    (a, b) =>
      b.reasoningScore -
      a.reasoningScore
  );


  const opportunities = [

    ...propertyResults,

    ...mobilityResults

  ];


  console.log(
    "[Lifestyle Discovery] Properties:",
    propertyResults.length
  );


  console.log(
    "[Lifestyle Discovery] Mobility:",
    mobilityResults.length
  );


  console.log(
    "[Lifestyle Discovery] Total:",
    opportunities.length
  );


  /* ========================================================
     RETURN CONTRACT
  ======================================================== */

  return {

    success:
      true,

    context,

    opportunities,

    count:
      opportunities.length,

    intent

  };

}


/* ============================================================
   EXPORT
============================================================ */

module.exports = {

  discoverOpportunities

};
