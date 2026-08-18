const {
  runLifestyleAgent
} = require("./index");


async function runTest() {

  const request = {
    message:
      "I want to find a suitable property in Nairobi."
  };


  const context = {

    userGoal:
      "property",

    location: {

      city:
        "Nairobi",

      country:
        "Kenya"

    },

    budget:
      50000,

    availableTime:
      "2 hours",

    user: {

      preferences: [
        "property",
        "convenience"
      ]

    }

  };


  try {

    /*
     * ==========================================
     * RUN LIFESTYLE AGENT
     * ==========================================
     */

    const result =
      await runLifestyleAgent(
        request,
        context
      );


    console.log(
      "===== RIDE2VIEW LIFESTYLE AGENT TEST ====="
    );


    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    console.log(
      "SUCCESS:",
      result.success
    );


    /*
     * ==========================================
     * DISCOVERY
     * ==========================================
     */

    console.log(
      "===== DISCOVERY ====="
    );

    console.log(
      JSON.stringify(
        result.discovery,
        null,
        2
      )
    );


    /*
     * ==========================================
     * REASONING
     * ==========================================
     */

    console.log(
      "===== REASONING ====="
    );

    console.log(
      JSON.stringify(
        result.reasoning,
        null,
        2
      )
    );


    /*
     * ==========================================
     * RECOMMENDATIONS
     * ==========================================
     */

    const recommendations =
      Array.isArray(
        result.recommendations
      )
        ? result.recommendations
        : [];


    console.log(
      "===== RECOMMENDATIONS ====="
    );


    recommendations.forEach(
      (recommendation, index) => {

        console.log(
          `OPPORTUNITY ${index + 1}`
        );

        console.log(
          "ID:",
          recommendation.id
        );

        console.log(
          "TYPE:",
          recommendation.type
        );

        console.log(
          "CATEGORY:",
          recommendation.category
        );

        console.log(
          "SERVICE:",
          recommendation.service
        );

        console.log(
          "TITLE:",
          recommendation.title
        );

        console.log(
          "LOCATION:",
          JSON.stringify(
            recommendation.location,
            null,
            2
          )
        );

        console.log(
          "PRICE:",
          recommendation.price
        );

        console.log(
          "BUDGET:",
          recommendation.budget
        );

        console.log(
          "AVAILABILITY:",
          recommendation.availability
        );


        /*
         * ==========================================
         * UTILITY SCORE
         * ==========================================
         */

        console.log(
          "UTILITY SCORE:",
          recommendation.utilityScore !== undefined
            ? recommendation.utilityScore
            : "NOT AVAILABLE"
        );


        /*
         * ==========================================
         * MATCH PERCENTAGE
         *
         * The agent's utility score is currently
         * the matching score used by the system.
         * ==========================================
         */

        console.log(
          "MATCH PERCENTAGE:",
          recommendation.utilityScore !== undefined
            ? recommendation.utilityScore + "%"
            : "NOT AVAILABLE"
        );


        /*
         * ==========================================
         * REASONING SCORE
         * ==========================================
         */

        console.log(
          "REASONING SCORE:",
          recommendation.reasoningScore !== undefined
            ? recommendation.reasoningScore
            : "NOT AVAILABLE"
        );


        /*
         * ==========================================
         * UTILITY LEVEL
         * ==========================================
         */

        console.log(
          "UTILITY LEVEL:",
          recommendation.utilityLevel !== undefined
            ? recommendation.utilityLevel
            : "NOT AVAILABLE"
        );


        /*
         * ==========================================
         * RANK
         * ==========================================
         */

        console.log(
          "RANK:",
          recommendation.rank !== undefined
            ? recommendation.rank
            : index + 1
        );


        console.log(
          "--------------------------------"
        );

      }
    );


    /*
     * ==========================================
     * FINAL RESULT
     * ==========================================
     */

    console.log(
      "===== RAW AGENT RESULT ====="
    );

    console.log(
      JSON.stringify(
        result,
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

    console.error(
      error
    );

    process.exitCode = 1;

  }

}


runTest();
