/**
 * Ride2View Lifestyle Agent
 * Canonical Opportunity Contract
 *
 * Purpose:
 * Provides one predictable structure for every opportunity
 * entering the Lifestyle Agent pipeline.
 *
 * Pipeline:
 *
 * Raw Provider Data
 *       ↓
 * createOpportunity()
 *       ↓
 * Canonical Opportunity
 *       ↓
 * Validation
 *       ↓
 * Reasoning
 *       ↓
 * Scoring
 *       ↓
 * Ranking
 *       ↓
 * Recommendation
 *
 * Supported opportunity types:
 * - property
 * - mobility
 * - ride
 * - food
 * - commerce
 * - short_stay
 * - event
 * - cargo
 * - service
 * - experience
 * - trend
 *
 * Compatibility semantics:
 *
 * true  = compatibility has been verified
 * false = incompatibility has been verified
 * null  = compatibility cannot be determined
 */


/**
 * Create a canonical Ride2View opportunity.
 *
 * This function does NOT calculate recommendation scores.
 * It creates a predictable data contract that downstream
 * systems can safely consume.
 *
 * @param {Object} data
 * @returns {Object}
 */
function createOpportunity(data = {}) {

  const location =
    data.location || {};

  const source =
    typeof data.source === "object" && data.source !== null
      ? data.source
      : {};

  const economics =
    data.economics || {};

  const timing =
    data.timing || {};

  const relevance =
    data.relevance || {};

  const scoring =
    data.scoring || {};

  const metadata =
    data.metadata || {};

  const property =
    data.property || {};


  return {

    // =====================================================
    // CONTRACT VERSION
    // =====================================================

    contractVersion:
      data.contractVersion ||
      "1.0.0",


    // =====================================================
    // IDENTITY
    // =====================================================

    id:
      data.id ||
      null,

    type:
      data.type ||
      null,

    category:
      data.category ||
      data.type ||
      null,

    service:
      data.service ||
      null,


    // =====================================================
    // CONTENT
    // =====================================================

    title:
      data.title ||
      "Lifestyle Opportunity",

    description:
      data.description ||
      "",

    reason:
      data.reason ||
      "",

    recommendation:
      data.recommendation ||
      "",


    // =====================================================
    // SOURCE
    // =====================================================

    source: {

      provider:
        source.provider ||
        (typeof data.source === "string"
          ? data.source
          : "ride2view"),

      sourceId:
        source.sourceId ||
        data.sourceId ||
        null,

      sourceUrl:
        source.sourceUrl ||
        data.sourceUrl ||
        null

    },


    // =====================================================
    // LOCATION
    // =====================================================

    location: {

      name:
        location.name ||
        null,

      address:
        location.address ||
        null,

      city:
        location.city ||
        null,

      country:
        location.country ||
        null,

      latitude:
        location.latitude ??
        null,

      longitude:
        location.longitude ??
        null,

      source:
        location.source ||
        null,

      available:
        location.available ??
        false

    },


    // =====================================================
    // ECONOMICS
    // =====================================================

    economics: {

      price:
        economics.price ??
        data.price ??
        null,

      currency:
        economics.currency ||
        data.currency ||
        "KES",

      pricePeriod:
        economics.pricePeriod ||
        data.pricePeriod ||
        null,

      minPrice:
        economics.minPrice ??
        null,

      maxPrice:
        economics.maxPrice ??
        null

    },


    // =====================================================
    // LEGACY / COMPATIBILITY ECONOMIC FIELDS
    // =====================================================

    /*
     * These fields are retained because existing
     * Ride2View reasoning/scoring code may already
     * consume them directly.
     */

    price:
      data.price ??
      economics.price ??
      null,

    budget:
      data.budget ??
      null,


    // =====================================================
    // TIMING
    // =====================================================

    timing: {

      availableFrom:
        timing.availableFrom ||
        null,

      availableTo:
        timing.availableTo ||
        null,

      duration:
        timing.duration ??
        null

    },


    // =====================================================
    // LEGACY / COMPATIBILITY TIMING FIELDS
    // =====================================================

    availableTime:
      data.availableTime ??
      timing.availableFrom ??
      null,

    availability:
      data.availability ||
      null,


    // =====================================================
    // RELEVANCE
    // =====================================================

    relevance: {

      score:
        relevance.score ??
        null,

      categories:
        Array.isArray(relevance.categories)
          ? relevance.categories
          : [],

      tags:
        Array.isArray(relevance.tags)
          ? relevance.tags
          : [],

      audience:
        Array.isArray(relevance.audience)
          ? relevance.audience
          : [],

      signals:
        relevance.signals || {}

    },


    // =====================================================
    // LEGACY RELEVANCE FIELD
    // =====================================================

    /*
     * Preserve the original value for compatibility
     * with existing reasoning code.
     */

    relevanceLegacy:
      data.relevance &&
      typeof data.relevance !== "object"
        ? data.relevance
        : null,


    // =====================================================
    // PROPERTY DATA
    // =====================================================

    property: {

      propertyType:
        property.propertyType ||
        data.propertyType ||
        null,

      bedrooms:
        property.bedrooms ??
        data.bedrooms ??
        null,

      bathrooms:
        property.bathrooms ??
        data.bathrooms ??
        null,

      area:
        property.area ??
        data.area ??
        null,

      areaUnit:
        property.areaUnit ||
        data.areaUnit ||
        null

    },


    // =====================================================
    // COMPATIBILITY SIGNALS
    // =====================================================

    locationMatch:
      data.locationMatch ??
      null,


    /*
     * Budget compatibility has THREE states:
     *
     * true:
     *   Opportunity is within budget.
     *
     * false:
     *   Opportunity exceeds budget.
     *
     * null:
     *   Price or budget is unknown.
     *
     * IMPORTANT:
     * Never convert null into false.
     */

    budgetCompatible:
      data.budgetCompatible === true
        ? true
        : data.budgetCompatible === false
          ? false
          : null,


    timeCompatible:
      data.timeCompatible === true
        ? true
        : data.timeCompatible === false
          ? false
          : null,


    preferenceMatch:
      data.preferenceMatch === true
        ? true
        : data.preferenceMatch === false
          ? false
          : null,


    // =====================================================
    // SCORING
    // =====================================================

    /*
     * Discovery should normally leave these as null.
     *
     * The scoring engine populates them later.
     */

    scoring: {

      relevanceScore:
        scoring.relevanceScore ??
        null,

      valueScore:
        scoring.valueScore ??
        null,

      frictionScore:
        scoring.frictionScore ??
        null,

      totalScore:
        scoring.totalScore ??
        null

    },


    // =====================================================
    // METADATA
    // =====================================================

    metadata: {

      confidence:
        metadata.confidence ??
        null,

      createdAt:
        metadata.createdAt ||
        data.createdAt ||
        new Date().toISOString(),

      updatedAt:
        metadata.updatedAt ||
        data.updatedAt ||
        new Date().toISOString(),

      version:
        metadata.version ||
        "1.0.0"

    }

  };

}


/**
 * Check whether an object looks like a canonical
 * Ride2View opportunity.
 *
 * This is intentionally lightweight.
 *
 * Full validation will be handled separately by
 * opportunity-validator.js in the next step.
 *
 * @param {Object} opportunity
 * @returns {Boolean}
 */
function isCanonicalOpportunity(opportunity) {

  if (!opportunity ||
      typeof opportunity !== "object") {

    return false;
  }

  return Boolean(
    opportunity.contractVersion &&
    opportunity.id &&
    opportunity.type &&
    opportunity.title &&
    opportunity.location &&
    opportunity.economics &&
    opportunity.timing &&
    opportunity.relevance &&
    opportunity.scoring &&
    opportunity.metadata
  );

}


/**
 * Export public API.
 */
module.exports = {
  createOpportunity,
  isCanonicalOpportunity
};
