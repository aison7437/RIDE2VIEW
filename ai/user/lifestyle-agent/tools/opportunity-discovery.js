/*
 * ============================================================
 * RIDE2VIEW LIFESTYLE AGENT
 * OPPORTUNITY DISCOVERY
 * ============================================================
 *
 * Responsibilities:
 * 1. Discover property opportunities
 * 2. Discover mobility opportunities
 * 3. Respect location
 * 4. Respect budget
 * 5. Detect user segments/preferences
 * 6. Support student housing
 * 7. Support premium/luxury properties
 * 8. Support women-only mobility
 * 9. Preserve opportunities for downstream reasoning/ranking
 *
 * ============================================================
 */

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}


function getSearchText(request, context) {
  return [
    request?.message,
    context?.userGoal,
    ...(context?.user?.preferences || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}


function hasAny(text, values) {
  return values.some((value) =>
    text.includes(normalize(value))
  );
}


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
      city: "Nairobi",
      country: "Kenya"
    },

    price: 45000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "85 sqm",

      tags: [
        "residential",
        "family",
        "professional"
      ]
    }
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
      city: "Nairobi",
      country: "Kenya"
    },

    price: 55000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      area: "120 sqm",

      tags: [
        "westlands",
        "family",
        "professional",
        "spacious"
      ]
    }
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
      city: "Nairobi",
      country: "Kenya"
    },

    price: 35000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 1,
      bathrooms: 1,
      area: "55 sqm",

      tags: [
        "affordable",
        "young-professional",
        "single"
      ]
    }
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
      city: "Nairobi",
      country: "Kenya"
    },

    price: 60000,

    availability: "available",

    property: {
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      area: "95 sqm",

      tags: [
        "lavington",
        "family",
        "professional"
      ]
    }
  },


  /*
   * ----------------------------------------------------------
   * STUDENT PROPERTY
   * ----------------------------------------------------------
   */

  {
    id: "property-student-001",
    type: "property",
    category: "property",
    service: "property-search",

    title: "Student Studio - Kilimani",

    description:
      "Affordable student accommodation in Kilimani, Nairobi with convenient access to universities, transport and essential services.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 25000,

    availability: "available",

    property: {
      propertyType: "student-studio",
      bedrooms: 1,
      bathrooms: 1,
      area: "30 sqm",

      tags: [
        "student",
        "student-friendly",
        "student accommodation",
        "affordable",
        "university",
        "campus"
      ]
    }
  },


  /*
   * ----------------------------------------------------------
   * PREMIUM PROPERTY
   * ----------------------------------------------------------
   */

  {
    id: "property-premium-001",
    type: "property",
    category: "property",
    service: "property-search",

    title: "Luxury 4 Bedroom Villa - Runda",

    description:
      "Premium luxury villa in Runda with spacious living areas, high-end finishes and private amenities.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 450000,

    availability: "available",

    property: {
      propertyType: "luxury-villa",
      bedrooms: 4,
      bathrooms: 4,
      area: "350 sqm",

      tags: [
        "luxury",
        "premium",
        "villa",
        "mansion",
        "high-end",
        "executive"
      ]
    }
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
      "Arrange transportation that can support the user's journey.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: null,

    availability: "available",

    mobility: {
      segment: "general",

      tags: [
        "transport",
        "ride",
        "mobility"
      ]
    }
  },


  /*
   * ----------------------------------------------------------
   * WOMEN-ONLY MOBILITY
   * ----------------------------------------------------------
   */

  {
    id: "ride-women-only",

    type: "mobility",
    category: "mobility",
    service: "ride",

    title: "Women-Only Ride",

    description:
      "Women-only transportation option designed for passengers who prefer a women-focused mobility service.",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    price: 750,

    availability: "available",

    mobility: {
      segment: "women-only",

      tags: [
        "women-only",
        "women only",
        "female",
        "female driver",
        "women",
        "safety",
        "transport"
      ]
    }
  }
];


/*
 * ============================================================
 * DISCOVERY
 * ============================================================
 */

async function discoverOpportunities(request = {}, context = {}) {

  const searchText =
    getSearchText(request, context);


  const requestedCity =
    normalize(
      context?.location?.city
    );


  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  const requestedBedrooms =
    extractBedrooms(searchText);


  const wantsStudent =
    hasAny(searchText, [
      "student",
      "students",
      "student housing",
      "student accommodation",
      "campus"
    ]);


  const wantsPremium =
    hasAny(searchText, [
      "premium",
      "luxury",
      "luxurious",
      "high-end",
      "executive",
      "mansion",
      "villa"
    ]);


  const wantsWomenOnly =
    hasAny(searchText, [
      "women-only",
      "women only",
      "female",
      "women"
    ]);


  const wantsMobility =
    hasAny(searchText, [
      "transport",
      "transportation",
      "ride",
      "mobility",
      "get there",
      "driving"
    ]);


  /*
   * ----------------------------------------------------------
   * PROPERTY FILTERING
   * ----------------------------------------------------------
   */

  let properties =
    PROPERTY_DATASET.filter((property) => {

      if (!requestedCity) {
        return true;
      }

      return (
        normalize(property.location?.city) ===
        requestedCity
      );
    });


  /*
   * Exact bedroom preference.
   *
   * If requested, prioritize matching
   * bedrooms rather than removing every
   * alternative.
   */

  if (requestedBedrooms !== null) {

    properties.sort((a, b) => {

      const aMatch =
        Number(a.property?.bedrooms) ===
        requestedBedrooms;

      const bMatch =
        Number(b.property?.bedrooms) ===
        requestedBedrooms;

      return Number(bMatch) - Number(aMatch);
    });
  }


  /*
   * Student requests.
   */

  if (wantsStudent) {

    properties.sort((a, b) => {

      const aStudent =
        hasAny(
          a.property?.tags?.join(" "),
          [
            "student",
            "student-friendly",
            "student accommodation",
            "campus"
          ]
        );

      const bStudent =
        hasAny(
          b.property?.tags?.join(" "),
          [
            "student",
            "student-friendly",
            "student accommodation",
            "campus"
          ]
        );

      return Number(bStudent) - Number(aStudent);
    });
  }


  /*
   * Premium requests.
   */

  if (wantsPremium) {

    properties.sort((a, b) => {

      const aPremium =
        hasAny(
          a.property?.tags?.join(" "),
          [
            "luxury",
            "premium",
            "villa",
            "mansion",
            "high-end",
            "executive"
          ]
        );

      const bPremium =
        hasAny(
          b.property?.tags?.join(" "),
          [
            "luxury",
            "premium",
            "villa",
            "mansion",
            "high-end",
            "executive"
          ]
        );

      return Number(bPremium) - Number(aPremium);
    });
  }


  /*
   * Budget-compatible properties first.
   *
   * IMPORTANT:
   * Do not delete over-budget properties.
   * They remain useful as alternatives.
   */

  if (budget !== null) {

    properties.sort((a, b) => {

      const aAffordable =
        a.price <= budget;

      const bAffordable =
        b.price <= budget;

      if (
        aAffordable !==
        bAffordable
      ) {

        return (
          Number(bAffordable) -
          Number(aAffordable)
        );
      }

      return a.price - b.price;
    });
  }


  /*
   * ----------------------------------------------------------
   * MOBILITY
   * ----------------------------------------------------------
   */

  let mobility = [];


  if (wantsMobility || wantsWomenOnly) {

    mobility =
      MOBILITY_DATASET.filter((ride) => {

        return (
          !requestedCity ||
          normalize(
            ride.location?.city
          ) === requestedCity
        );
      });


    if (wantsWomenOnly) {

      mobility.sort((a, b) => {

        const aWomen =
          hasAny(
            a.mobility?.tags?.join(" "),
            [
              "women-only",
              "women only",
              "female"
            ]
          );

        const bWomen =
          hasAny(
            b.mobility?.tags?.join(" "),
            [
              "women-only",
              "women only",
              "female"
            ]
          );

        return (
          Number(bWomen) -
          Number(aWomen)
        );
      });
    }
  }


  /*
   * ----------------------------------------------------------
   * COMBINE RESULTS
   * ----------------------------------------------------------
   */

  const opportunities = [
    ...properties,
    ...mobility
  ];


  /*
   * Keep the discovery result manageable.
   * The downstream reasoning/ranking stages
   * will determine final ordering.
   */

  const selected =
    opportunities.slice(0, 10);


  return {
    success: true,

    opportunities: selected,

    count: selected.length,

    context: {
      requestedCity,
      budget,
      requestedBedrooms,
      wantsStudent,
      wantsPremium,
      wantsWomenOnly,
      wantsMobility
    }
  };
}


/*
 * ============================================================
 * BEDROOM EXTRACTION
 * ============================================================
 */

function extractBedrooms(text) {

  const match =
    String(text || "").match(
      /(\d+)\s*(?:bedroom|bedrooms|br)\b/i
    );


  if (!match) {
    return null;
  }


  return Number(match[1]);
}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  discoverOpportunities
};
