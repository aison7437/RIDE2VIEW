const {
  runLifestyleAgent
} = require("./index");

const {
  applyRecommendationDecision,
  selectPrimaryRecommendation,
  buildDecisionSummary
} = require("./Recommendation/recommendation-decision");

const {
  buildLifestyleResponse
} = require("./Recommendation/lifestyle-response-builder");


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
      "DISCOVERY:",
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
      "REASONING:",
      JSON.stringify(
        result.reasoning,
        null,
        2
      )
    );


    /*
     * ==========================================
     * RANKING
     * ==========================================
     */

    console.log(
      "RANKING:",
      JSON.stringify(
        result.ranking,
        null,
        2
      )
    );


    /*
     * ==========================================
     * CANONICAL RECOMMENDATIONS
     * ==========================================
     */

    const recommendations =
      Array.isArray(result.recommendations)
        ? result.recommendations
        : [];


    console.log(
      "===== CANONICAL OPPORTUNITY CHECK ====="
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

        console.log(
          "SCORE:",
          recommendation.score
        );

        console.log(
          "MATCH PERCENTAGE:",
          recommendation.matchPercentage !== undefined
            ? recommendation.matchPercentage + "%"
            : "NOT AVAILABLE"
        );

        console.log(
          "REASONING SCORE:",
          recommendation.reasoningScore
        );

        console.log(
          "--------------------------------"
        );

      }
    );


    /*
     * ==========================================
     * RECOMMENDATION DECISION ENGINE
     * ==========================================
     */

    const decidedRecommendations =
      applyRecommendationDecision(
        recommendations
      );


    /*
     * ==========================================
     * DECISION SUMMARY
     * ==========================================
     */

    const decisionSummary =
      buildDecisionSummary(
        decidedRecommendations
      );


    /*
     * ==========================================
     * PRIMARY RECOMMENDATION
     * ==========================================
     */

    const primaryRecommendation =
      selectPrimaryRecommendation(
        decidedRecommendations
      );


    console.log(
      "===== RECOMMENDATION DECISIONS ====="
    );


    decidedRecommendations.forEach(
      (recommendation, index) => {

        console.log(
          `DECISION ${index + 1}`
        );

        console.log(
          "TITLE:",
          recommendation.title
        );

        console.log(
          "DECISION:",
          recommendation.decision
        );

        console.log(
          "PRIORITY:",
          recommendation.priority
        );

        console.log(
          "PRIMARY:",
          recommendation.primary
        );

        console.log(
          "DECISION REASON:",
          recommendation.decisionReason
        );

        console.log(
          "RECOMMENDED ACTION:",
          recommendation.recommendedAction
        );

        console.log(
          "--------------------------------"
        );

      }
    );


    /*
     * ==========================================
     * DECISION SUMMARY OUTPUT
     * ==========================================
     */

    console.log(
      "===== DECISION SUMMARY ====="
    );

    console.log(
      JSON.stringify(
        decisionSummary,
        null,
        2
      )
    );


    /*
     * ==========================================
     * PRIMARY OUTPUT
     * ==========================================
     */

    console.log(
      "===== PRIMARY RECOMMENDATION ====="
    );

    console.log(
      JSON.stringify(
        primaryRecommendation,
        null,
        2
      )
    );


    /*
     * ==========================================
     * LIFESTYLE RESPONSE BUILDER
     * ==========================================
     */

    const lifestyleResponse =
      buildLifestyleResponse(
        decidedRecommendations,
        context
      );


    /*
     * ==========================================
     * FINAL USER RESPONSE
     * ==========================================
     */

    console.log(
      "===== FINAL LIFESTYLE RESPONSE ====="
    );

    console.log(
      JSON.stringify(
        lifestyleResponse,
        null,
        2
      )
    );


    /*
     * ==========================================
     * RAW RECOMMENDATIONS
     * ==========================================
     */

    console.log(
      "===== RECOMMENDATIONS ====="
    );

    console.log(
      JSON.stringify(
        recommendations,
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
