const {
  runLifestyleAgent
} = require("../index");

const scenarios = [
  {
    name: "Baseline Nairobi property search",

    request: {
      message: "I want to find a suitable property in Nairobi."
    },

    context: {
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
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      maxBudget: 50000
    }
  },

  {
    name: "Three bedroom property",

    request: {
      message: "Find me a 3 bedroom property in Nairobi."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 100000,

      availableTime: "2 hours",

      user: {
        preferences: [
          "property",
          "3 bedrooms"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      bedrooms: 3
    }
  },

  {
    name: "Budget optimization",

    request: {
      message:
        "Find me the most affordable suitable property in Nairobi."
    },

    context: {
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
          "affordable"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      maxBudget: 50000,
      cheapestFirst: true
    }
  },

  {
    name: "Westlands property",

    request: {
      message:
        "Find me a property in Westlands."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 100000,

      availableTime: "2 hours",

      user: {
        preferences: [
          "property",
          "Westlands"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Westlands"
    }
  },

  {
    name: "Property plus transportation",

    request: {
      message:
        "Find me a suitable property in Nairobi and help me get there."
    },

    context: {
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
          "convenience",
          "transport"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      allowMobility: true
    }
  },

  {
    name: "One hour viewing",

    request: {
      message:
        "I need to find a property I can view within one hour."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 50000,

      availableTime: "1 hour",

      user: {
        preferences: [
          "property",
          "fast viewing"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      maxViewingTime: 60
    }
  },

  {
    name: "Women only mobility",

    request: {
      message:
        "Find me a property in Nairobi and suitable women-only transport."
    },

    context: {
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
          "women-only",
          "transport"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      allowMobility: true,
      womenOnly: true
    }
  },

  {
    name: "Student housing",

    request: {
      message:
        "Find affordable student accommodation in Nairobi."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 30000,

      availableTime: "2 hours",

      user: {
        preferences: [
          "property",
          "student",
          "affordable"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      maxBudget: 30000,
      student: true
    }
  },

  {
    name: "Premium property",

    request: {
      message:
        "Find me a premium luxury property in Nairobi."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 500000,

      availableTime: "4 hours",

      user: {
        preferences: [
          "property",
          "luxury",
          "premium"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      premium: true
    }
  },

  {
    name: "Budget failure / alternatives",

    request: {
      message:
        "Find me a suitable property in Nairobi for KSh 10000."
    },

    context: {
      userGoal: "property",

      location: {
        city: "Nairobi",
        country: "Kenya"
      },

      budget: 10000,

      availableTime: "2 hours",

      user: {
        preferences: [
          "property",
          "affordable"
        ]
      }
    },

    assertions: {
      category: "property",
      location: "Nairobi",
      maxBudget: 10000,
      handleBudgetFailure: true
    }
  }
];


/*
 * ============================================================
 * HELPER FUNCTIONS
 * ============================================================
 */

function getRecommendations(result) {
  return Array.isArray(result?.recommendations)
    ? result.recommendations
    : [];
}


function isProperty(item) {
  return (
    item &&
    (
      item.type === "property" ||
      item.category === "property"
    )
  );
}


function isMobility(item) {
  return (
    item &&
    (
      item.type === "mobility" ||
      item.category === "mobility" ||
      item.service === "ride"
    )
  );
}


/*
 * Convert text safely to lowercase.
 */

function normalizeText(value) {
  return String(value || "").toLowerCase();
}


/*
 * Get searchable text from an opportunity.
 */

function getSearchText(item) {
  return JSON.stringify(item || {}).toLowerCase();
}


/*
 * ============================================================
 * SCENARIO ASSERTIONS
 * ============================================================
 */

function assertScenario(result, scenario) {

  const recommendations =
    getRecommendations(result);

  const assertions =
    scenario.assertions;

  const propertyRecommendations =
    recommendations.filter(isProperty);

  const mobilityRecommendations =
    recommendations.filter(isMobility);

  const failures = [];


  /*
   * ----------------------------------------------------------
   * BASIC AGENT VALIDATION
   * ----------------------------------------------------------
   */

  if (!result || result.success !== true) {

    failures.push(
      "Agent did not return success=true."
    );
  }


  if (recommendations.length === 0) {

    failures.push(
      "No recommendations returned."
    );
  }


  /*
   * ----------------------------------------------------------
   * AGENT PIPELINE VALIDATION
   * ----------------------------------------------------------
   */

  if (
    !result?.discovery ||
    result.discovery.success !== true
  ) {

    failures.push(
      "Opportunity discovery did not complete successfully."
    );
  }


  if (
    !result?.reasoning ||
    result.reasoning.enabled !== true
  ) {

    failures.push(
      "Reasoning engine was not enabled."
    );
  }


  if (
    !result?.ranking ||
    typeof result.ranking.count !== "number"
  ) {

    failures.push(
      "Ranking stage did not return a valid result."
    );
  }


  if (
    typeof result?.count !== "number"
  ) {

    failures.push(
      "Agent result does not contain a valid recommendation count."
    );
  }


  /*
   * ----------------------------------------------------------
   * PROPERTY CATEGORY
   * ----------------------------------------------------------
   */

  if (
    assertions.category === "property" &&
    propertyRecommendations.length === 0
  ) {

    failures.push(
      "No property recommendation returned."
    );
  }


  /*
   * ----------------------------------------------------------
   * LOCATION
   * ----------------------------------------------------------
   */

  if (assertions.location) {

    const requestedLocation =
      normalizeText(assertions.location);

    const locationMatch =
      propertyRecommendations.some(
        (item) => {

          const city =
            normalizeText(
              item.location?.city
            );

          const title =
            normalizeText(
              item.title
            );

          const description =
            normalizeText(
              item.description
            );

          return (
            city === requestedLocation ||
            title.includes(requestedLocation) ||
            description.includes(requestedLocation)
          );
        }
      );

    if (!locationMatch) {

      failures.push(
        `No property recommendation matched location: ${assertions.location}`
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * BUDGET
   * ----------------------------------------------------------
   */

  if (
    assertions.maxBudget !== undefined
  ) {

    const pricedProperties =
      propertyRecommendations.filter(
        (item) =>
          typeof item.price === "number"
      );

    const affordable =
      pricedProperties.filter(
        (item) =>
          item.price <= assertions.maxBudget
      );


    /*
     * If properties exist but none are
     * within budget, this is only acceptable
     * for an explicit budget-failure scenario.
     */

    if (
      pricedProperties.length > 0 &&
      affordable.length === 0
    ) {

      if (
        !assertions.handleBudgetFailure
      ) {

        failures.push(
          `No property recommendation was within budget ${assertions.maxBudget}.`
        );
      }
    }


    /*
     * If affordable properties exist,
     * the primary recommendation should
     * not unnecessarily exceed the budget.
     */

    if (
      affordable.length > 0 &&
      propertyRecommendations.length > 0
    ) {

      const firstProperty =
        propertyRecommendations[0];

      if (
        typeof firstProperty.price === "number" &&
        firstProperty.price > assertions.maxBudget
      ) {

        failures.push(
          `An affordable property exists, but the primary recommendation exceeds the budget of ${assertions.maxBudget}.`
        );
      }
    }
  }


  /*
   * ----------------------------------------------------------
   * BEDROOMS
   * ----------------------------------------------------------
   */

  if (
    assertions.bedrooms !== undefined
  ) {

    const bedroomMatch =
      propertyRecommendations.some(
        (item) =>
          Number(
            item.property?.bedrooms
          ) ===
          Number(
            assertions.bedrooms
          )
      );

    if (!bedroomMatch) {

      failures.push(
        `No property matched ${assertions.bedrooms} bedrooms.`
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * CHEAPEST FIRST
   * ----------------------------------------------------------
   */

  if (
    assertions.cheapestFirst
  ) {

    const priced =
      propertyRecommendations.filter(
        (item) =>
          typeof item.price === "number"
      );

    if (priced.length > 1) {

      const cheapest =
        Math.min(
          ...priced.map(
            (item) =>
              item.price
          )
        );

      if (
        priced[0].price !== cheapest
      ) {

        failures.push(
          "Cheapest suitable property was not ranked first."
        );
      }
    }
  }


  /*
   * ----------------------------------------------------------
   * UTILITY RANKING
   * ----------------------------------------------------------
   *
   * Higher utility must rank ahead of lower utility.
   *
   * This validates the actual recommendation
   * architecture instead of assuming that
   * cheapest always means best.
   * ----------------------------------------------------------
   */

  if (
    propertyRecommendations.length > 1
  ) {

    const rankedProperties =
      propertyRecommendations.filter(
        (item) =>
          typeof item.utilityScore === "number"
      );


    for (
      let i = 1;
      i < rankedProperties.length;
      i++
    ) {

      const previous =
        rankedProperties[i - 1];

      const current =
        rankedProperties[i];


      if (
        current.utilityScore >
        previous.utilityScore
      ) {

        failures.push(
          "Recommendations are not ordered by descending utility score."
        );

        break;
      }
    }
  }


  /*
   * ----------------------------------------------------------
   * RANK FIELD VALIDATION
   * ----------------------------------------------------------
   */

  const rankedItems =
    recommendations.filter(
      (item) =>
        typeof item.rank === "number"
    );

  if (
    rankedItems.length > 1
  ) {

    for (
      let i = 1;
      i < rankedItems.length;
      i++
    ) {

      if (
        rankedItems[i].rank <
        rankedItems[i - 1].rank
      ) {

        failures.push(
          "Recommendation rank values are not ordered correctly."
        );

        break;
      }
    }
  }


  /*
   * ----------------------------------------------------------
   * WESTLANDS / SPECIFIC LOCATION
   * ----------------------------------------------------------
   */

  if (
    assertions.location === "Westlands"
  ) {

    const westlandsMatch =
      propertyRecommendations.some(
        (item) => {

          const city =
            normalizeText(
              item.location?.city
            );

          const title =
            normalizeText(
              item.title
            );

          const description =
            normalizeText(
              item.description
            );

          return (
            city === "westlands" ||
            title.includes("westlands") ||
            description.includes("westlands")
          );
        }
      );


    if (!westlandsMatch) {

      failures.push(
        "No property recommendation matched Westlands."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * MOBILITY
   * ----------------------------------------------------------
   */

  if (
    assertions.allowMobility
  ) {

    if (
      mobilityRecommendations.length === 0
    ) {

      failures.push(
        "Mobility was requested but no mobility recommendation was returned."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * WOMEN-ONLY MOBILITY
   * ----------------------------------------------------------
   */

  if (
    assertions.womenOnly
  ) {

    const womenOnlyMatch =
      mobilityRecommendations.some(
        (item) => {

          const text =
            getSearchText(item);

          return (
            text.includes("women-only") ||
            text.includes("women only") ||
            text.includes("female")
          );
        }
      );


    if (!womenOnlyMatch) {

      failures.push(
        "Women-only transport was requested but no women-only mobility option was identified."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * STUDENT HOUSING
   * ----------------------------------------------------------
   */

  if (
    assertions.student
  ) {

    const studentMatch =
      propertyRecommendations.some(
        (item) => {

          const text =
            getSearchText(item);

          return (
            text.includes("student") ||
            text.includes("student-friendly") ||
            text.includes("student accommodation")
          );
        }
      );


    if (!studentMatch) {

      failures.push(
        "Student accommodation was requested but no student-oriented property was identified."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * PREMIUM / LUXURY
   * ----------------------------------------------------------
   */

  if (
    assertions.premium
  ) {

    const premiumMatch =
      propertyRecommendations.some(
        (item) => {

          const text =
            getSearchText(item);

          return (
            text.includes("luxury") ||
            text.includes("premium") ||
            text.includes("villa") ||
            text.includes("mansion")
          );
        }
      );


    if (!premiumMatch) {

      failures.push(
        "Premium/luxury property was requested but no premium property was identified."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * VIEWING TIME
   * ----------------------------------------------------------
   */

  if (
    assertions.maxViewingTime !== undefined
  ) {

    const resultText =
      getSearchText(result);


    const hasTimeContext =
      resultText.includes("1 hour") ||
      resultText.includes("60 minutes") ||
      resultText.includes("60 min") ||
      result?.context?.availableTime === "1 hour";


    if (!hasTimeContext) {

      failures.push(
        `Viewing-time constraint of ${assertions.maxViewingTime} minutes was not reflected in the result.`
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * BUDGET FAILURE HANDLING
   * ----------------------------------------------------------
   */

  if (
    assertions.handleBudgetFailure
  ) {

    const pricedProperties =
      propertyRecommendations.filter(
        (item) =>
          typeof item.price === "number"
      );


    if (
      pricedProperties.length === 0
    ) {

      failures.push(
        "Budget failure scenario returned no priced property alternatives."
      );
    }


    /*
     * The agent does not need to invent
     * a property under an impossible budget.
     *
     * It should instead return alternatives,
     * explanation, summary, or a next action.
     */

    const hasAlternativeExplanation =
      Boolean(
        result?.summary ||
        result?.nextAction ||
        result?.primary?.reason ||
        result?.primary?.recommendation
      );


    if (
      !hasAlternativeExplanation
    ) {

      failures.push(
        "Budget failure was detected but the agent did not provide useful alternative context."
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * PRIMARY RECOMMENDATION VALIDATION
   * ----------------------------------------------------------
   */

  if (
    recommendations.length > 0
  ) {

    if (!result?.primary) {

      failures.push(
        "Recommendations exist but no primary recommendation was returned."
      );

    } else {

      const primaryExists =
        recommendations.some(
          (item) =>
            item.id === result.primary.id
        );

      if (!primaryExists) {

        failures.push(
          "Primary recommendation does not exist inside the recommendation list."
        );
      }
    }
  }


  /*
   * ----------------------------------------------------------
   * NEXT ACTION VALIDATION
   * ----------------------------------------------------------
   */

  if (
    result?.nextAction
  ) {

    if (
      typeof result.nextAction.action !== "string"
    ) {

      failures.push(
        "nextAction.action must be a string."
      );
    }

    if (
      typeof result.nextAction.label !== "string"
    ) {

      failures.push(
        "nextAction.label must be a string."
      );
    }
  }


  return failures;
}


/*
 * ============================================================
 * RUN ONE SCENARIO
 * ============================================================
 */

async function runScenario(
  scenario,
  index
) {

  console.log("");

  console.log(
    "=================================================="
  );

  console.log(
    `SCENARIO ${index + 1}: ${scenario.name}`
  );

  console.log(
    "=================================================="
  );


  try {

    const result =
      await runLifestyleAgent(
        scenario.request,
        scenario.context
      );


    const failures =
      assertScenario(
        result,
        scenario
      );


    console.log(
      "SUCCESS:",
      result?.success
    );


    console.log(
      "DISCOVERY:",
      result?.discovery?.success,
      "COUNT:",
      result?.discovery?.count
    );


    console.log(
      "REASONING:",
      result?.reasoning?.enabled,
      "COUNT:",
      result?.reasoning?.count
    );


    console.log(
      "RANKING:",
      result?.ranking?.count
    );


    console.log(
      "RECOMMENDATIONS:",
      getRecommendations(result).length
    );


    if (result?.primary) {

      console.log(
        "PRIMARY:",
        result.primary.title
      );


      console.log(
        "PRIMARY SCORE:",
        result.primary.utilityScore
      );


      console.log(
        "PRIMARY RANK:",
        result.primary.rank
      );
    }


    if (
      failures.length === 0
    ) {

      console.log(
        "STATUS: PASS"
      );


      return {
        passed: true,
        failures: []
      };
    }


    console.log(
      "STATUS: FAIL"
    );


    failures.forEach(
      (failure) => {

        console.log(
          "  ✗",
          failure
        );
      }
    );


    return {
      passed: false,
      failures
    };


  } catch (error) {

    console.log(
      "STATUS: ERROR"
    );


    console.log(
      "  ✗",
      error.message
    );


    return {
      passed: false,
      failures: [
        error.message
      ]
    };
  }
}


/*
 * ============================================================
 * MAIN TEST RUNNER
 * ============================================================
 */

async function main() {

  console.log(
    "=============================================="
  );

  console.log(
    "RIDE2VIEW LIFESTYLE AGENT SCENARIO TEST SUITE"
  );

  console.log(
    "=============================================="
  );


  const results = [];


  for (
    let index = 0;
    index < scenarios.length;
    index++
  ) {

    const result =
      await runScenario(
        scenarios[index],
        index
      );


    results.push(result);
  }


  const passed =
    results.filter(
      (result) =>
        result.passed
    ).length;


  const failed =
    results.length - passed;


  console.log("");


  console.log(
    "=============================================="
  );

  console.log(
    "FINAL TEST SUMMARY"
  );

  console.log(
    "=============================================="
  );


  console.log(
    `TOTAL: ${results.length}`
  );


  console.log(
    `PASSED: ${passed}`
  );


  console.log(
    `FAILED: ${failed}`
  );


  console.log(
    `PASS RATE: ${
      (
        (passed / results.length) *
        100
      ).toFixed(1)
    }%`
  );


  console.log(
    "=============================================="
  );


  if (
    failed > 0
  ) {

    process.exitCode = 1;

  } else {

    console.log(
      "ALL SCENARIOS PASSED."
    );
  }
}


/*
 * ============================================================
 * START TEST SUITE
 * ============================================================
 */

main();
