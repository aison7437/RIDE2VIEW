# Lifestyle Agent User Preferences

## Purpose

This file defines the types of user preferences and learning signals that the Lifestyle Agent may use for personalization.

## Preference Categories

### Food

- Favorite cuisines
- Dietary preferences when explicitly provided
- Preferred restaurants
- Preferred meal times
- Food budget

### Shopping

- Preferred categories
- Favorite stores or sellers
- Shopping frequency
- Typical budget ranges

### Mobility

- Preferred vehicle types
- Preferred ride times
- Preferred pickup locations
- Preferred travel distance

### Property

- Preferred locations
- Property type
- Number of bedrooms
- Budget range
- Property purpose

### Entertainment

- Preferred activities
- Preferred locations
- Preferred times
- Typical budget

### Travel

- Preferred destinations
- Travel frequency
- Preferred transport methods
- Travel budget

## Learning Signals

The system may learn from authorized interactions such as:

- Recommendations accepted
- Recommendations rejected
- User corrections
- Repeated searches
- Repeated bookings
- Explicit preferences
- Explicit dislikes

## Preference Confidence

Each learned preference should have a confidence level.

Possible values:

- Low
- Medium
- High

Explicitly stated preferences should generally receive higher confidence than assumptions based only on behavior.

## Temporary Context

Temporary circumstances should not automatically become permanent preferences.

Example:

A user ordering pizza once does not mean pizza is their favorite food.

## Privacy

Only authorized information may be stored or used.

Sensitive information should not be collected or inferred unnecessarily.

Users should remain in control of their personalization data.

## Future Implementation

This document currently defines the memory structure.

A future backend/database layer will manage actual persistent user preference data.
