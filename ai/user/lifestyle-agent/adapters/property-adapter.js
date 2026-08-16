/**
 * Ride2View Lifestyle Agent
 * Property Adapter
 *
 * Converts property records into the
 * canonical Ride2View Opportunity format.
 */

const {
  createOpportunity
} = require("../models/opportunity-schema");


function adaptProperty(property = {}) {

  return createOpportunity({

    id:
      property.id,

    type:
      "property",

    category:
      "property",

    service:
      "property-search",

    title:
      property.title,

    description:
      property.description,

    location:
      property.location,

    price:
      property.price,

    availability:
      property.availability,

    property:
      property.property,

    source:
      "property-dataset"

  });

}


function adaptProperties(properties = []) {

  if (!Array.isArray(properties)) {
    return [];
  }

  return properties.map(
    adaptProperty
  );

}


module.exports = {
  adaptProperty,
  adaptProperties
};
