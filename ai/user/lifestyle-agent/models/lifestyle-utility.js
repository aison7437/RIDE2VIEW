/**
 * Ride2View Lifestyle Agent
 * Lifestyle Utility Model
 *
 * Calculates how useful an opportunity is for a specific user context.
 *
 * Utility factors:
 *
 * 1. Goal fit
 * 2. Location fit
 * 3. Budget fit
 * 4. Preference fit
 * 5. Value efficiency
 * 6. Time compatibility
 *
 * This model is intentionally deterministic and explainable.
 */

function calculateLifestyleUtility(
  opportunity = {},
  context = {}
) {

  /*
   * -----------------------------
   * 1. GOAL FIT
   * -----------------------------
   */

  const goalFit =
    opportunity.relevance === "high"
      ? 100
      : opportunity.relevance === "medium"
        ? 60
        : 20;


  /*
   * -----------------------------
   * 2. LOCATION FIT
   * -----------------------------
   */

  const locationFit =
    opportunity.locationMatch === true
      ? 100
      : 0;


  /*
   * -----------------------------
   * 3. BUDGET FIT
   * -----------------------------
   */

  const userBudget =
    Number(context.budget) || 0;

  const price =
    Number(opportunity.price) || 0;

  let budgetFit = 0;

  if (price === 0) {

    /*
     * Services without a defined price
     * should not automatically fail.
     */

    budgetFit = 50;

  } else if (userBudget <= 0) {

    /*
     * No budget supplied.
     */

    budgetFit = 50;

  } else if (price <= userBudget) {

    /*
     * More remaining budget = better flexibility.
     */

    const remainingBudget =
      userBudget - price;

    const remainingPercentage =
      remainingBudget / userBudget;

    budgetFit =
      Math.min(
        100,
        70 + (remainingPercentage * 30)
      );

  } else {

    /*
     * Penalize opportunities exceeding
     * the user's stated budget.
     */

    const excess =
      price - userBudget;

    const excessPercentage =
      excess / userBudget;

    budgetFit =
      Math.max(
        0,
        70 - (excessPercentage * 100)
      );
  }


  /*
   * -----------------------------
   * 4. PREFERENCE FIT
   * -----------------------------
   */

  const preferenceFit =
    opportunity.preferenceMatch === true
      ? 100
      : 0;


  /*
   * -----------------------------
   * 5. TIME FIT
   * -----------------------------
   */

  const timeFit =
    opportunity.timeCompatible === true
      ? 100
      : opportunity.timeCompatible === false
        ? 0
        : 50;


  /*
   * -----------------------------
   * 6. VALUE EFFICIENCY
   * -----------------------------
   *
   * For properties we can estimate
   * value from usable space.
   */

  let valueEfficiency = 50;

  if (
    opportunity.property &&
    opportunity.property.area
  ) {

    const areaMatch =
      String(
        opportunity.property.area
      ).match(/[\d.]+/);

    const area =
      areaMatch
        ? Number(areaMatch[0])
        : 0;

    if (
      area > 0 &&
      price > 0
    ) {

      const pricePerSqm =
        price / area;

      /*
       * Lower price per square metre
       * indicates better space efficiency.
       *
       * 100 = excellent value
       * 50  = neutral
       * 0   = poor value
       */

      valueEfficiency =
        Math.max(
          0,
          Math.min(
            100,
            100 - (
              pricePerSqm / 1000
            )
          )
        );

    }
  }


  /*
   * -----------------------------
   * 7. WEIGHTED UTILITY
   * -----------------------------
   *
   * The weights intentionally prioritize
   * the user's actual objective.
   */

  const utilityScore =
      (goalFit * 0.25)
    + (locationFit * 0.20)
    + (budgetFit * 0.20)
    + (preferenceFit * 0.15)
    + (valueEfficiency * 0.10)
    + (timeFit * 0.10);


  /*
   * -----------------------------
   * 8. UTILITY CLASSIFICATION
   * -----------------------------
   */

  let utilityLevel;

  if (utilityScore >= 85) {

    utilityLevel = "excellent";

  } else if (utilityScore >= 70) {

    utilityLevel = "high";

  } else if (utilityScore >= 50) {

    utilityLevel = "moderate";

  } else if (utilityScore >= 30) {

    utilityLevel = "low";

  } else {

    utilityLevel = "poor";
  }


  /*
   * -----------------------------
   * 9. RETURN EXPLAINABLE RESULT
   * -----------------------------
   */

  return {

    utilityScore:
      Number(
        utilityScore.toFixed(2)
      ),

    utilityLevel,

    factors: {

      goalFit,

      locationFit,

      budgetFit,

      preferenceFit,

      valueEfficiency,

      timeFit

    },

    explanation:
      buildUtilityExplanation({
        goalFit,
        locationFit,
        budgetFit,
        preferenceFit,
        valueEfficiency,
        timeFit,
        utilityLevel
      })

  };

}


/**
 * Builds a human-readable explanation
 * for debugging and recommendation generation.
 */

function buildUtilityExplanation(
  factors
) {

  const explanations = [];


  if (factors.goalFit >= 80) {

    explanations.push(
      "Strongly aligned with the user's goal."
    );

  } else if (factors.goalFit >= 50) {

    explanations.push(
      "Moderately aligned with the user's goal."
    );

  } else {

    explanations.push(
      "Weak alignment with the user's goal."
    );
  }


  if (factors.locationFit >= 80) {

    explanations.push(
      "Strong location compatibility."
    );
  }


  if (factors.budgetFit >= 80) {

    explanations.push(
      "Strong budget compatibility."
    );

  } else if (factors.budgetFit >= 50) {

    explanations.push(
      "Acceptable budget compatibility."
    );

  } else {

    explanations.push(
      "Weak budget compatibility."
    );
  }


  if (factors.preferenceFit >= 80) {

    explanations.push(
      "Matches the user's stated preferences."
    );
  }


  if (factors.valueEfficiency >= 80) {

    explanations.push(
      "Provides strong value efficiency."
    );
  }


  if (factors.timeFit >= 80) {

    explanations.push(
      "Compatible with the user's available time."
    );
  }


  explanations.push(
    `Overall utility is ${factors.utilityLevel}.`
  );


  return explanations;

}


module.exports = {
  calculateLifestyleUtility
};
