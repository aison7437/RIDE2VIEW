/**
 * Ride2View Lifestyle Agent
 * Canonical Opportunity Schema
 *
 * Purpose:
 * Provides one consistent structure for every
 * opportunity entering the Lifestyle Agent pipeline.
 *
 * Supported opportunity types:
 * property
 * mobility
 * food
 * commerce
 */

function createOpportunity(data = {}) {

  const location = data.location || {};

  return {

    // -----------------------------------------
    // Identity
    // -----------------------------------------

    id:
      data.id || null,

    type:
      data.type || null,

    category:
      data.category || data.type || null,

    service:
      data.service || null,


    // -----------------------------------------
    // Content
    // -----------------------------------------

    title:
      data.title || "Lifestyle Opportunity",

    description:
      data.description || "",

    reason:
      data.reason || "",

    recommendation:
      data.recommendation || "",


    // -----------------------------------------
    // Location
    // -----------------------------------------

    location: {

      latitude:
        location.latitude ?? null,

      longitude:
        location.longitude ?? null,

      city:
        location.city || null,

      country:
        location.country || null,

      source:
        location.source || null,

      available:
        location.available ?? false

    },


    // -----------------------------------------
    // Constraints
    // -----------------------------------------

    price:
      data.price ?? null,

    budget:
      data.budget ?? null,

    availableTime:
      data.availableTime ?? null,

    availability:
      data.availability || null,


    // -----------------------------------------
    // Property-specific data
    // -----------------------------------------

    property: {

      propertyType:
        data.property?.propertyType ||
        data.propertyType ||
        null,

      bedrooms:
        data.property?.bedrooms ??
        data.bedrooms ??
        null,

      bathrooms:
        data.property?.bathrooms ??
        data.bathrooms ??
        null,

      area:
        data.property?.area ??
        data.area ??
        null

    },


    // -----------------------------------------
    // Compatibility signals
    // -----------------------------------------

    relevance:
      data.relevance || null,

    locationMatch:
      data.locationMatch ?? false,

    budgetCompatible:
      data.budgetCompatible ?? false,

    timeCompatible:
      data.timeCompatible ?? false,

    preferenceMatch:
      data.preferenceMatch ?? false,


    // -----------------------------------------
    // Metadata
    // -----------------------------------------

    source:
      data.source || "ride2view",

    createdAt:
      data.createdAt ||
      new Date().toISOString()

  };
}


module.exports = {
  createOpportunity
};
