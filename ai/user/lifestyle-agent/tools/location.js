/**
 * Ride2View Lifestyle Agent
 * Location Tool
 *
 * Purpose:
 * Provides a controlled interface for obtaining
 * location context for lifestyle recommendations.
 *
 * NOTE:
 * This is currently a foundation/mock implementation.
 * A real location provider will be connected later.
 */

function getLocationContext(input = {}) {
  return {
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    city: input.city ?? null,
    country: input.country ?? "Kenya",
    source: input.source ?? "user",
    available: Boolean(
      input.latitude !== undefined ||
      input.longitude !== undefined ||
      input.city
    )
  };
}

module.exports = {
  getLocationContext
};
