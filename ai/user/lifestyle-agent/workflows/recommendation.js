/**
 * Ride2View Lifestyle Agent
 * Recommendation Workflow
 *
 * Pipeline:
 *
 * Discovery
 *    ↓
 * Reasoning
 *    ↓
 * Utility Scoring
 *    ↓
 * Ranking
 *    ↓
 * Recommendations
 */

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}


function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}


function getSearchText(item) {
  return JSON.stringify(item || {}).toLowerCase();
}


function getPrice(item) {

  if (typeof item?.price === "number") {
    return item.price;
  }

  if (
    typeof item?.property?.price === "number"
  ) {
    return item.property.price;
  }

  return null;
}


function getLocation(item) {

  return normalizeText(
    item?.location?.city ||
    item?.location ||
    item?.property?.location ||
    ""
  );
}


function getBedrooms(item) {

  if (
    typeof item?.property?.bedrooms === "number"
  ) {
    return item.property.bedrooms;
  }

  if (
    typeof item?.bedrooms === "number"
  ) {
    return item.bedrooms;
  }

  return null;
}


/* =========================================================
   UTILITY SCORING
   ========================================================= */

function calculateUtilityScore(
  opportunity = {},
  context = {}
) {

  let score = 50;


  const text =
    getSearchText(opportunity);


  const requestedLocation =
    normalizeText(
      context?.location?.city ||
      context?.location ||
      ""
    );


  const opportunityLocation =
    getLocation(opportunity);


  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  const price =
    getPrice(opportunity);


  const requestedBedrooms =
    Number(
      context?.bedrooms ||
      context?.constraints?.bedrooms ||
      0
    );


  const opportunityBedrooms =
    getBedrooms(opportunity);


  /* =======================================================
     LOCATION
     ======================================================= */

  if (
    requestedLocation &&
    opportunityLocation
  ) {

    if (
      opportunityLocation ===
      requestedLocation
    ) {

      score += 20;

    } else if (
      text.includes(requestedLocation)
    ) {

      score += 10;
    }
  }


  /* =======================================================
     BUDGET
     ======================================================= */

  if (
    budget !== null &&
    price !== null
  ) {

    if (price <= budget) {

      score += 20;

      /*
       * More affordable properties receive
       * an additional advantage.
       */

      if (price <= budget * 0.5) {

        score += 5;

      } else if (
        price <= budget * 0.75
      ) {

        score += 3;
      }

    } else {

      /*
       * Penalize properties above budget.
       */

      const ratio =
        price / budget;

      if (ratio <= 1.25) {

        score -= 10;

      } else if (ratio <= 2) {

        score -= 20;

      } else {

        score -= 35;
      }
    }
  }


  /* =======================================================
     BEDROOM MATCH
     ======================================================= */

  if (
    requestedBedrooms > 0 &&
    opportunityBedrooms !== null
  ) {

    if (
      opportunityBedrooms ===
      requestedBedrooms
    ) {

      score += 15;

    } else {

      const difference =
        Math.abs(
          opportunityBedrooms -
          requestedBedrooms
        );

      score -=
        Math.min(
          difference * 5,
          15
        );
    }
  }


  /* =======================================================
     AFFORDABLE INTENT
     ======================================================= */

  const wantsAffordable =
    Boolean(
      context?.affordable ||
      context?.wantsAffordable ||
      context?.budgetOptimization ||
      context?.constraints?.affordable ||
      text.includes("affordable")
    );


  if (wantsAffordable) {

    if (
      price !== null &&
      budget !== null &&
      price <= budget
    ) {

      score += 15;
    }
  }


  /* =======================================================
     STUDENT INTENT
     ======================================================= */

  const wantsStudent =
    Boolean(
      context?.student ||
      context?.wantsStudent ||
      text.includes("student")
    );


  if (wantsStudent) {

    if (
      text.includes("student")
    ) {

      score += 20;

    } else {

      score -= 5;
    }
  }


  /* =======================================================
     PREMIUM / LUXURY INTENT
     ======================================================= */

  const wantsPremium =
    Boolean(
      context?.premium ||
      context?.wantsPremium ||
      text.includes("premium") ||
      text.includes("luxury")
    );


  if (wantsPremium) {

    if (
      text.includes("premium") ||
      text.includes("luxury") ||
      text.includes("villa") ||
      text.includes("mansion")
    ) {

      score += 20;

    } else {

      score -= 5;
    }
  }


  /* =======================================================
     WOMEN-ONLY INTENT
     ======================================================= */

  const wantsWomenOnly =
    Boolean(
      context?.womenOnly ||
      context?.wantsWomenOnly
    );


  if (wantsWomenOnly) {

    if (
      text.includes("women-only") ||
      text.includes("women only") ||
      text.includes("female")
    ) {

      score += 20;
    }
  }


  /* =======================================================
     TRANSPORT / MOBILITY
     ======================================================= */

  const wantsMobility =
    Boolean(
      context?.allowMobility ||
      context?.wantsMobility ||
      context?.transport
    );


  if (wantsMobility) {

    const isMobility =
      normalizeText(
        opportunity?.type
      ) === "mobility" ||
      normalizeText(
        opportunity?.category
      ) === "mobility" ||
      normalizeText(
        opportunity?.service
      ) === "ride";


    if (isMobility) {

      score += 15;
    }
  }


  /* =======================================================
     TIME CONSTRAINT
     ======================================================= */

  const availableTime =
    normalizeText(
      context?.availableTime
    );


  if (
    availableTime &&
    (
      availableTime.includes("hour") ||
      availableTime.includes("minute")
    )
  ) {

    const opportunityTime =
      normalizeText(
        opportunity?.availability ||
        opportunity?.viewingTime ||
        opportunity?.duration ||
        ""
      );


    if (
      opportunityTime &&
      text.includes(
        availableTime
      )
    ) {

      score += 10;
    }
  }


  /* =======================================================
     SCORE BOUNDS
     ======================================================= */

  score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );


  return score;
}


/* =========================================================
   SCORE OPPORTUNITIES
   ========================================================= */

function scoreRecommendations(
  opportunities = [],
  context = {}
) {

  const normalized =
    normalizeArray(
      opportunities
    );


  return normalized.map(
    (opportunity) => {

      const utilityScore =
        calculateUtilityScore(
          opportunity,
          context
        );


      return {

        ...opportunity,

        utilityScore,

        score:
          typeof opportunity.score === "number"
            ? opportunity.score
            : utilityScore,

        matchPercentage:
          utilityScore,

        reasoningScore:
          typeof opportunity.reasoningScore === "number"
            ? opportunity.reasoningScore
            : 0
      };
    }
  );
}


/* =========================================================
   RANK OPPORTUNITIES
   ========================================================= */

function rankRecommendations(
  opportunities = [],
  context = {}
) {

  const scored =
    scoreRecommendations(
      opportunities,
      context
    );


  return scored
    .sort(
      (a, b) => {

        /*
         * Primary ordering:
         * utility score descending.
         */

        if (
          b.utilityScore !==
          a.utilityScore
        ) {

          return (
            b.utilityScore -
            a.utilityScore
          );
        }


        /*
         * Secondary ordering:
         * cheaper first.
         */

        const priceA =
          getPrice(a);

        const priceB =
          getPrice(b);


        if (
          priceA !== null &&
          priceB !== null
        ) {

          return priceA - priceB;
        }


        return 0;
      }
    )
    .map(
      (opportunity, index) => ({

        ...opportunity,

        rank:
          index + 1

      })
    );
}


/* =========================================================
   BUILD RECOMMENDATIONS
   ========================================================= */

function buildRecommendations(
  opportunities = [],
  context = {}
) {

  return rankRecommendations(
    opportunities,
    context
  );
}


/* =========================================================
   GENERATE LIFESTYLE RECOMMENDATIONS
   ========================================================= */

async function generateLifestyleRecommendations(
  input = {}
) {

  const {
    opportunities = [],
    context = {}
  } = input;


  const normalizedOpportunities =
    normalizeArray(
      opportunities
    );


  /*
   * Score and rank.
   */

  const recommendations =
    buildRecommendations(
      normalizedOpportunities,
      context
    );


  /*
   * Primary recommendation.
   */

  const primary =
    recommendations.length > 0
      ? recommendations[0]
      : null;


  /*
   * Budget information.
   */

  const budget =
    typeof context?.budget === "number"
      ? context.budget
      : null;


  const pricedRecommendations =
    recommendations.filter(
      (item) =>
        typeof getPrice(item) === "number"
    );


  const affordableRecommendations =
    budget !== null
      ? pricedRecommendations.filter(
          (item) =>
            getPrice(item) <= budget
        )
      : [];


  /*
   * Budget failure handling.
   */

  let summary =
    null;

  let nextAction =
    null;


  if (
    budget !== null &&
    pricedRecommendations.length > 0 &&
    affordableRecommendations.length === 0
  ) {

    const cheapest =
      pricedRecommendations
        .slice()
        .sort(
          (a, b) =>
            getPrice(a) -
            getPrice(b)
        )[0];


    summary =
      `No suitable property was found within the KSh ${budget} budget. The closest available alternative starts at KSh ${getPrice(cheapest)}.`;


    nextAction = {

      action:
        "increase_budget",

      label:
        "View closest alternatives"

    };

  } else if (
    recommendations.length > 0
  ) {

    nextAction = {

      action:
        "view_recommendation",

      label:
        "View recommended property"

    };
  }


  /*
   * Return structured result.
   */

  return {

    success:
      true,

    count:
      recommendations.length,

    primary,

    recommendations,

    summary,

    nextAction

  };
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  generateLifestyleRecommendations,

  buildRecommendations,

  scoreRecommendations,

  rankRecommendations

};
