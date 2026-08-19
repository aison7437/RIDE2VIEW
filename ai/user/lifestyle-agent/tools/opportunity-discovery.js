/*
 * ============================================================
 * RIDE2VIEW LIFESTYLE AGENT
 * OPPORTUNITY DISCOVERY
 * ============================================================
 */

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


/*
 * ============================================================
 * BUILD SEARCH TEXT
 * ============================================================
 *
 * We inspect BOTH the request and context because the
 * workflow may place the original message in either location.
 */

function getSearchText(request = {}, context = {}) {

  const preferences =
    Array.isArray(context?.user?.preferences)
      ? context.user.preferences
      : [];

  const contextPreferences =
    Array.isArray(context?.preferences)
      ? context.preferences
      : [];

  return [
    request?.message,
    request?.query,
    request?.text,

    context?.message,
    context?.request?.message,

    context?.userGoal,

    ...preferences,
    ...contextPreferences
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}


function hasAny(text, values) {

  const normalized =
    normalize(text);

  return values.some(
    (value) =>
      normalized.includes(
        normalize(value)
      )
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
   * STUDENT
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
   * PREMIUM
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
      "Transportation service to help the user travel to and from the selected property.",

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
        "transportation",
        "ride",
        "mobility",
        "general"
      ]
    }
  },


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
        "women",
        "female driver",
        "transport",
        "ride",
        "mobility"
      ]
    },

    womenOnly: true
  }
];


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
 * DISCOVERY
 * ============================================================
 */

async function discoverOpportunities(
  request = {},
  context = {}
) {

  const searchText =
    getSearchText(
      request,
      context
    );


  console.log(
    "[Lifestyle Discovery] Search text:",
    searchText
  );


  const requestedCity =
    normalize(
      context?.location?.city
    );


  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  const requestedBedrooms =
    extractBedrooms(
      searchText
    );


  /*
   * ----------------------------------------------------------
   * INTENT DETECTION
   * ----------------------------------------------------------
   */

  const wantsStudent =
    hasAny(
      searchText,
      [
        "student",
        "students",
        "student housing",
        "student accommodation",
        "campus"
      ]
    );


  const wantsPremium =
    hasAny(
      searchText,
      [
        "premium",
        "luxury",
        "luxurious",
        "high-end",
        "executive",
        "mansion",
        "villa"
      ]
    );


  const wantsWomenOnly =
    hasAny(
      searchText,
      [
        "women-only",
        "women only",
        "female",
        "women"
      ]
    );


  const wantsMobility =
    hasAny(
      searchText,
      [
        "transport",
        "transportation",
        "ride",
        "mobility",
        "get there",
        "travel",
        "driving"
      ]
    );


  console.log(
    "[Lifestyle Discovery] Intent:",
    {
      wantsStudent,
      wantsPremium,
      wantsWomenOnly,
      wantsMobility
    }
  );


  /*
   * ----------------------------------------------------------
   * PROPERTY DISCOVERY
   * ----------------------------------------------------------
   */

  let properties =
    PROPERTY_DATASET.filter(
      (property) => {

        if (!requestedCity) {
          return true;
        }

        return (
          normalize(
            property.location?.city
          ) === requestedCity
        );
      }
    );


  /*
   * Bedroom preference.
   */

  if (
    requestedBedrooms !== null
  ) {

    properties.sort(
      (a, b) => {

        const aMatch =
          Number(
            a.property?.bedrooms
          ) ===
          requestedBedrooms;

        const bMatch =
          Number(
            b.property?.bedrooms
          ) ===
          requestedBedrooms;

        return (
          Number(bMatch) -
          Number(aMatch)
        );
      }
    );
  }


  /*
   * Student preference.
   */

  if (wantsStudent) {

    properties.sort(
      (a, b) => {

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

        return (
          Number(bStudent) -
          Number(aStudent)
        );
      }
    );
  }


  /*
   * Premium preference.
   */

  if (wantsPremium) {

    properties.sort(
      (a, b) => {

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

        return (
          Number(bPremium) -
          Number(aPremium)
        );
      }
    );
  }


  /*
   * Budget compatibility.
   *
   * Affordable properties are moved
   * ahead of over-budget alternatives.
   */

  if (budget !== null) {

    properties.sort(
      (a, b) => {

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

        return (
          a.price -
          b.price
        );
      }
    );
  }


  /*
   * ----------------------------------------------------------
   * MOBILITY DISCOVERY
   * ----------------------------------------------------------
   *
   * CRITICAL:
   *
   * Mobility is discovered independently from property
   * discovery.
   *
   * We do NOT allow property slicing to remove it.
   */

  let mobility = [];


  if (
    wantsMobility ||
    wantsWomenOnly
  ) {

    mobility =
      MOBILITY_DATASET.filter(
        (ride) => {

          if (!requestedCity) {
            return true;
          }

          return (
            normalize(
              ride.location?.city
            ) === requestedCity
          );
        }
      );


    /*
     * Women-only request gets the
     * women-only ride first.
     */

    if (wantsWomenOnly) {

      mobility.sort(
        (a, b) => {

          const aWomen =
            Boolean(
              a.womenOnly
            ) ||
            hasAny(
              a.mobility?.tags?.join(" "),
              [
                "women-only",
                "women only",
                "female"
              ]
            );


          const bWomen =
            Boolean(
              b.womenOnly
            ) ||
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
        }
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * COMBINE
   * ----------------------------------------------------------
   */

  /*
   * Keep the property set independent.
   */

  const selectedProperties =
    properties.slice(0, 5);


  /*
   * Mobility is appended AFTER property
   * selection so it cannot disappear.
   */

  const opportunities = [
    ...selectedProperties,
    ...mobility
  ];


  console.log(
    "[Lifestyle Discovery] Properties:",
    selectedProperties.length
  );


  console.log(
    "[Lifestyle Discovery] Mobility:",
    mobility.length
  );


  console.log(
    "[Lifestyle Discovery] Total:",
    opportunities.length
  );


  /*
   * ----------------------------------------------------------
   * RESULT
   * ----------------------------------------------------------
   */

  return {

    success: true,

    opportunities,

    count:
      opportunities.length,

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
 * EXPORT
 * ============================================================
 */

module.exports = {
  discoverOpportunities
};
