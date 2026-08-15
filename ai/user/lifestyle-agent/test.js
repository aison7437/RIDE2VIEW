/**
 * Ride2View Lifestyle Agent
 * End-to-End Test
 *
 * Verifies that the Lifestyle Agent can:
 * 1. Accept a user request
 * 2. Build context
 * 3. Discover opportunities
 * 4. Score opportunities
 * 5. Rank recommendations
 * 6. Return a structured result
 */

const {
  runLifestyleAgent
} = require("./index");


async function runTest() {
  const request = {
    message: "I want to find a suitable property in Nairobi."
  };

  const context = {
    userGoal: "property",

    location: {
      city: "Nairobi",
      country: "Kenya"
    },

    budget: 50000,

    availableTime: "2 hours",

    user: {
      preferences: [
        "property",
        "convenience"
      ]
    }
  };

  try {
    const result = await runLifestyleAgent(
      request,
      context
    );

    console.log(
      "RIDE2VIEW LIFESTYLE AGENT TEST"
    );

    console.log(
      JSON.stringify(result, null, 2)
    );

  } catch (error) {

    console.error(
      "Lifestyle Agent test failed:"
    );

    console.error(error);
  }
}


runTest();
