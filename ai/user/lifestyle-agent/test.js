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
      "===== RIDE2VIEW LIFESTYLE AGENT TEST ====="
    );

    console.log(
      "SUCCESS:",
      result.success
    );

    console.log(
      "DISCOVERY:",
      JSON.stringify(result.discovery, null, 2)
    );

    console.log(
      "REASONING:",
      JSON.stringify(result.reasoning, null, 2)
    );

    console.log(
      "RANKING:",
      JSON.stringify(result.ranking, null, 2)
    );

    console.log(
      "RECOMMENDATIONS:"
    );

    console.log(
      JSON.stringify(
        result.recommendations,
        null,
        2
      )
    );

    console.log(
      "===== END TEST ====="
    );

  } catch (error) {

    console.error(
      "LIFESTYLE AGENT TEST FAILED"
    );

    console.error(error);

    process.exitCode = 1;
  }
}

runTest();

runTest();
