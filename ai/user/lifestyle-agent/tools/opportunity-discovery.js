/*
 * ============================================================
 * RIDE2VIEW LIFESTYLE AGENT
 * OPPORTUNITY DISCOVERY
 * ============================================================
 *
 * Responsibilities:
 *
 * 1. Read request + context safely
 * 2. Detect user intent
 * 3. Discover property opportunities
 * 4. Discover mobility opportunities
 * 5. Support student / premium / women-only requests
 * 6. Preserve the downstream agent pipeline
 *
 * Pipeline:
 *
 * Request
 *   ↓
 * Intent Detection
 *   ↓
 * Property Discovery
 *   ↓
 * Mobility Discovery
 *   ↓
 * Combined Opportunities
 *   ↓
 * Reasoning
 *   ↓
 * Scoring
 *   ↓
 * Ranking
 *
 * ============================================================
 */


/*
 * ============================================================
 * PROPERTY DATASET
 * ============================================================
 */

const PROPERTY_DATASET = [

  {
    id: "property-001",

    type: "property",
    category: "property",
    service: "property-search",

    title: "2 Bedroom Apartment - Kilimani",

    description:
      "Modern 2 bedroom apartment suitable for residential living in Nairobi.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 45000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "85 sqm"
    },

    tags: [
      "property",
      "apartment",
      "2 bedroom",
      "residential",
      "kilimani",
      "nairobi"
    ],

    source: "property-dataset"
  },


  {
    id: "property-002",

    type: "property",
    category: "property",
    service: "property-search",

    title: "3 Bedroom Apartment - Westlands",

    description:
      "Spacious 3 bedroom apartment in Westlands, Nairobi.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 55000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      area: "120 sqm"
    },

    tags: [
      "property",
      "apartment",
      "3 bedroom",
      "westlands",
      "nairobi"
    ],

    source: "property-dataset"
  },


  {
    id: "property-003",

    type: "property",
    category: "property",
    service: "property-search",

    title: "1 Bedroom Apartment - Kilimani",

    description:
      "Affordable 1 bedroom apartment in Kilimani, Nairobi.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 35000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 1,
      bathrooms: 1,
      area: "55 sqm"
    },

    tags: [
      "property",
      "apartment",
      "1 bedroom",
      "affordable",
      "kilimani",
      "nairobi"
    ],

    source: "property-dataset"
  },


  {
    id: "property-004",

    type: "property",
    category: "property",
    service: "property-search",

    title: "2 Bedroom Apartment - Lavington",

    description:
      "Comfortable 2 bedroom apartment in Lavington, Nairobi.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 60000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "95 sqm"
    },

    tags: [
      "property",
      "apartment",
      "2 bedroom",
      "lavington",
      "nairobi"
    ],

    source: "property-dataset"
  },


  /*
   * Student opportunity
   */

  {
    id: "property-student-001",

    type: "property",
    category: "property",
    service: "property-search",

    title: "Student Studio - Kilimani",

    description:
      "Affordable student-friendly studio accommodation in Kilimani, Nairobi.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 25000,

    availability: "available",

    property: {
      propertyType: "student-studio",
      bedrooms: 1,
      bathrooms: 1,
      area: "35 sqm"
    },

    tags: [
      "property",
      "student",
      "student accommodation",
      "student-friendly",
      "affordable",
      "studio",
      "kilimani",
      "nairobi"
    ],

    source: "property-dataset"
  },


  /*
   * Premium opportunity
   */

  {
    id: "property-premium-001",

    type: "property",
    category: "property",
    service: "property-search",

    title: "Luxury Villa - Runda",

    description:
      "Premium luxury villa in Runda, Nairobi with spacious living areas and high-end amenities.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 450000,

    availability: "available",

    property: {
      propertyType: "villa",
      bedrooms: 5,
      bathrooms: 5,
      area: "450 sqm"
    },

    tags: [
      "property",
      "premium",
      "luxury",
      "villa",
      "mansion",
      "runda",
      "nairobi"
    ],

    source: "property-dataset"
  }

];


/*
 * ============================================================
 * MOBILITY DATASET
 * ============================================================
 */

const MOBILITY_DATASET = [

  {
    id: "ride-service",

    type: "mobility",
    category: "mobility",
    service: "ride",

    title: "Ride Service",

    description:
      "Arrange transportation to help the user travel to and from a property viewing.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: null,

    availability: null,

    mobility: {
      serviceType: "ride",
      womenOnly: false,
      studentFriendly: true,
      vip: false
    },

    tags: [
      "ride",
      "transport",
      "mobility",
      "property viewing",
      "nairobi"
    ],

    source: "ride2view"
  },


  {
    id: "women-only-ride",

    type: "mobility",
    category: "mobility",
    service: "ride",

    title: "Women-Only Ride",

    description:
      "Women-only transportation option designed for property viewing and other journeys.",

    location: {
      latitude: null,
      longitude: null,
      city: "Nairobi",
      country: "Kenya",
      source: null,
      available: false
    },

    price: 750,

    availability: "available",

    mobility: {
      serviceType: "women-only-ride",
      womenOnly: true,
      studentFriendly: false,
      vip: false
    },

    tags: [
      "ride",
      "transport",
      "mobility",
      "women-only",
      "women only",
      "female",
      "nairobi"
    ],

    source: "ride2view"
  }

];


/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeText(value) {

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.toLowerCase().trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");
  }

  return String(value)
    .toLowerCase()
    .trim();
}


/*
 * ============================================================
 * BUILD SEARCH TEXT
 * ============================================================
 *
 * IMPORTANT:
 *
 * The previous implementation produced:
 *
 * Search text:
 *
 * because it was apparently reading the wrong object.
 *
 * This implementation deliberately accepts:
 *
 * request
 * context
 * request.message
 * context.user.preferences
 * context.userGoal
 *
 * ============================================================
 */

function buildSearchText(request = {}, context = {}) {

  const message =
    request?.message ||
    request?.text ||
    request?.query ||
    "";

  const preferences =
    context?.user?.preferences || [];

  const userGoal =
    context?.userGoal || "";

  const location =
    context?.location || {};

  const locationText = [
    location?.city,
    location?.country,
    location?.area,
    location?.neighborhood
  ]
    .filter(Boolean)
    .join(" ");

  const searchText = [
    message,
    userGoal,
    locationText,
    preferences
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  return searchText.trim();
}


/*
 * ============================================================
 * INTENT DETECTION
 * ============================================================
 */

function detectIntent(request = {}, context = {}) {

  const searchText =
    buildSearchText(
      request,
      context
    );

  const wantsStudent =
    /\b(student|students|student housing|student accommodation|campus)\b/i
      .test(searchText);

  const wantsPremium =
    /\b(luxury|premium|high[- ]end|mansion|villa|executive)\b/i
      .test(searchText);

  const wantsWomenOnly =
    /\b(women[- ]only|women only|female[- ]only|female only|women)\b/i
      .test(searchText);

  const wantsMobility =
    /\b(transport|transportation|ride|taxi|mobility|driver|get there|take me|travel)\b/i
      .test(searchText);

  const wantsAffordable =
    /\b(affordable|cheap|cheapest|budget|low[- ]cost)\b/i
      .test(searchText);

  const bedroomsMatch =
    searchText.match(
      /\b([1-9])\s*[- ]?\s*bed(room)?s?\b/i
    );

  const bedrooms =
    bedroomsMatch
      ? Number(bedroomsMatch[1])
      : null;

  return {

    searchText,

    wantsStudent,

    wantsPremium,

    wantsWomenOnly,

    wantsMobility,

    wantsAffordable,

    bedrooms
  };
}


/*
 * ============================================================
 * PROPERTY FILTERING
 * ============================================================
 */

function discoverProperties(
  request,
  context,
  intent
) {

  let properties = [
    ...PROPERTY_DATASET
  ];


  /*
   * Student request
   */

  if (intent.wantsStudent) {

    properties =
      properties.filter(
        property =>
          property.tags?.some(
            tag =>
              /student/i.test(tag)
          )
      );
  }


  /*
   * Premium request
   */

  else if (intent.wantsPremium) {

    properties =
      properties.filter(
        property =>
          property.tags?.some(
            tag =>
              /premium|luxury|villa|mansion/i
                .test(tag)
          )
      );
  }


  /*
   * Bedroom request
   */

  else if (intent.bedrooms) {

    const exact =
      properties.filter(
        property =>
          Number(
            property.property?.bedrooms
          ) === intent.bedrooms
      );

    if (exact.length > 0) {
      properties = exact;
    }
  }


  /*
   * Budget
   */

  const budget =
    Number(context?.budget);

  if (
    Number.isFinite(budget) &&
    budget > 0
  ) {

    /*
     * Do not completely eliminate
     * alternatives when budget is too low.
     *
     * Keep alternatives so the agent can
     * explain the budget failure.
     */

    const affordable =
      properties.filter(
        property =>
          typeof property.price === "number" &&
          property.price <= budget
      );

    if (affordable.length > 0) {

      properties = [
        ...affordable,
        ...properties.filter(
          property =>
            !affordable.includes(property)
        )
      ];
    }
  }


  /*
   * Location
   */

  const requestedCity =
    normalizeText(
      context?.location?.city
    );

  if (requestedCity) {

    const locationMatches =
      properties.filter(
        property =>
          normalizeText(
            property.location?.city
          ) === requestedCity
      );

    if (locationMatches.length > 0) {
      properties = locationMatches;
    }
  }


  return properties;
}


/*
 * ============================================================
 * MOBILITY FILTERING
 * ============================================================
 */

function discoverMobility(
  request,
  context,
  intent
) {

  /*
   * No mobility requested.
   */

  if (!intent.wantsMobility) {
    return [];
  }


  let mobility =
    [
      ...MOBILITY_DATASET
    ];


  /*
   * Women-only request.
   */

  if (intent.wantsWomenOnly) {

    mobility =
      mobility.filter(
        item =>
          item.mobility?.womenOnly === true
      );
  }


  return mobility;
}


/*
 * ============================================================
 * OPPORTUNITY METADATA
 * ============================================================
 */

function enrichOpportunity(
  opportunity,
  context,
  intent
) {

  const result = {
    ...opportunity,

    createdAt:
      new Date().toISOString(),

    requestContext: {
      userGoal:
        context?.userGoal || null,

      budget:
        context?.budget ?? null,

      availableTime:
        context?.availableTime || null,

      intent
    }
  };


  /*
   * Location match
   */

  const requestedCity =
    normalizeText(
      context?.location?.city
    );

  const opportunityCity =
    normalizeText(
      opportunity.location?.city
    );

  result.locationMatch =
    Boolean(
      requestedCity &&
      opportunityCity &&
      requestedCity === opportunityCity
    );


  /*
   * Budget compatibility
   */

  const budget =
    Number(context?.budget);

  if (
    Number.isFinite(budget) &&
    typeof opportunity.price === "number"
  ) {

    result.budgetCompatible =
      opportunity.price <= budget;

  } else {

    result.budgetCompatible =
      null;
  }


  /*
   * Time compatibility
   */

  result.timeCompatible =
    true;


  /*
   * Preference matching
   */

  const preferenceText =
    normalizeText(
      context?.user?.preferences || []
    );

  const opportunityText =
    normalizeText(
      [
        opportunity.title,
        opportunity.description,
        opportunity.tags
      ]
    );

  result.preferenceMatch =
    preferenceText.length > 0 &&
    preferenceText
      .split(/\s+/)
      .some(
        token =>
          token.length > 3 &&
          opportunityText.includes(token)
      );


  /*
   * Preserve original source.
   */

  return result;
}


/*
 * ============================================================
 * MAIN DISCOVERY FUNCTION
 * ============================================================
 */

async function discoverOpportunities(
  request = {},
  context = {}
) {

  /*
   * Defensive normalization.
   */

  request =
    request || {};

  context =
    context || {};


  /*
   * Detect intent.
   */

  const intent =
    detectIntent(
      request,
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
        intent.wantsMobility
    }
  );


  /*
   * Discover properties.
   */

  const properties =
    discoverProperties(
      request,
      context,
      intent
    );


  /*
   * Discover mobility.
   */

  const mobility =
    discoverMobility(
      request,
      context,
      intent
    );


  /*
   * Combine.
   */

  const opportunities = [

    ...properties,

    ...mobility

  ].map(
    opportunity =>
      enrichOpportunity(
        opportunity,
        context,
        intent
      )
  );


  console.log(
    "[Lifestyle Discovery] Properties:",
    properties.length
  );

  console.log(
    "[Lifestyle Discovery] Mobility:",
    mobility.length
  );

  console.log(
    "[Lifestyle Discovery] Total:",
    opportunities.length
  );


  return {

    success: true,

    count:
      opportunities.length,

    opportunities,

    intent,

    properties,

    mobility

  };
}


/*
 * ============================================================
 * COMPATIBILITY ALIASES
 * ============================================================
 *
 * Different workflow versions may call the discovery
 * function under different names.
 *
 * Export all common names so the module remains stable.
 *
 * ============================================================
 */

module.exports = {

  discoverOpportunities,

  discoverLifestyleOpportunities:
    discoverOpportunities,

  generateOpportunities:
    discoverOpportunities,

  getOpportunities:
    discoverOpportunities,

  detectIntent,

  buildSearchText

};
