/**
 * Ride2View Lifestyle Agent
 * Property Test Dataset
 *
 * Temporary local dataset.
 *
 * This will later be replaced by:
 * Firebase
 * Ride2View property database
 * external property APIs
 * or another real data source.
 */

const properties = [

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
      area: "85 sqm"
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
      area: "120 sqm"
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
      area: "55 sqm"
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
      area: "95 sqm"
    }

  }

];


module.exports = {
  properties
};
