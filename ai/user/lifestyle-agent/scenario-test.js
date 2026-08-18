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
      message: "Find me the most affordable suitable property in Nairobi."
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
      message: "Find me a property in Westlands."
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
      location: "Nairobi"
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
      allowMobility: true
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
      maxBudget: 30000
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
      location: "Nairobi"
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
      handleBudgetFailure: true
    }
  }
];

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

function assertScenario(result, scenario) {
  const recommendations =
    getRecommendations(result);

  const assertions =
    scenario.assertions;

  const propertyRecommendations =
    recommendations.filter(isProperty);

  const failures = [];

  if (!result || result.success !== true) {
    failures.push("Agent did not return success=true.");
  }

  if (recommendations.length === 0) {
    failures.push("No recommendations returned.");
  }

  if (
    assertions.category === "property" &&
    propertyRecommendations.length === 0
  ) {
    failures.push(
      "No property recommendation returned."
    );
  }

  if (assertions.location) {
    const locationMatch =
      propertyRecommendations.some(
        (item) =>
          item.location?.city === assertions.location ||
          item.userLocation?.city === assertions.location ||
          item.title?.toLowerCase().includes(
            assertions.location.toLowerCase()
          )
      );

    if (!locationMatch) {
      failures.push(
        `No recommendation matched location: ${assertions.location}`
      );
    }
  }

  if (
    assertions.maxBudget !== undefined
  ) {
    const overBudget =
      propertyRecommendations.filter(
        (item) =>
          typeof item.price === "number" &&
          item.price > assertions.maxBudget
      );

    if (
      overBudget.length ===
      propertyRecommendations.length &&
      propertyRecommendations.length > 0
    ) {
      failures.push(
        `All property recommendations exceed budget ${assertions.maxBudget}.`
      );
    }
  }

  if (
    assertions.bedrooms !== undefined
  ) {
    const bedroomMatch =
      propertyRecommendations.some(
        (item) =>
          item.property?.bedrooms ===
          assertions.bedrooms
      );

    if (!bedroomMatch) {
      failures.push(
        `No property matched ${assertions.bedrooms} bedrooms.`
      );
    }
  }

  if (assertions.cheapestFirst) {
    const priced =
      propertyRecommendations.filter(
        (item) =>
          typeof item.price === "number"
      );

    if (priced.length > 1) {
      const cheapest =
        Math.min(
          ...priced.map(
            (item) => item.price
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

  if (
    assertions.allowMobility
  ) {
    const mobilityExists =
      recommendations.some(
        (item) =>
          item.type === "mobility" ||
          item.category === "mobility" ||
          item.service === "ride"
      );

    if (!mobilityExists) {
      failures.push(
        "Mobility was requested but no mobility recommendation was returned."
      );
    }
  }

  return failures;
}

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
    }

    if (failures.length === 0) {
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
      (result) => result.passed
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
      ((passed / results.length) * 100).toFixed(1)
    }%`
  );

  console.log(
    "=============================================="
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
