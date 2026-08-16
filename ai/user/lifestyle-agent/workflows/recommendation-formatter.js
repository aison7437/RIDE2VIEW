/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into
 * structured user recommendations.
 *
 * Responsibilities:
 * - Preserve scoring information
 * - Preserve match percentage
 * - Generate evidence-based match reasons
 * - Produce structured recommendations
 */


function formatRecommendations(
  rankedOpportunities,
  agentContext
) {

  if (!Array.isArray(rankedOpportunities)) {
    return [];
  }


  const context =
    agentContext || {};


  return rankedOpportunities.map(
    function (rankedItem, index) {

      const opportunity =
        rankedItem.opportunity ||
        rankedItem ||
        {};


      // -----------------------------------------
      // 1. Raw score
      // -----------------------------------------

      const score =
        Number(rankedItem.score) ||
        Number(rankedItem.rankingScore) ||
        Number(rankedItem.totalScore) ||
        0;


      // -----------------------------------------
      // 2. Match percentage
      // -----------------------------------------

      let matchPercentage =
        Number(
          rankedItem.matchPercentage
        );


      if (
        !Number.isFinite(matchPercentage)
      ) {

        matchPercentage =
          (score / 140) * 100;

      }


      matchPercentage =
        Math.max(
          0,
          Math.min(
            matchPercentage,
            100
          )
        );


      matchPercentage =
        Number(
          matchPercentage.toFixed(1)
        );


      // -----------------------------------------
      // 3. Basic opportunity information
      // -----------------------------------------

      const title =
        opportunity.title ||
        opportunity.name ||
        "Lifestyle Opportunity";


      const description =
        opportunity.description ||
        opportunity.summary ||
        "";


      const category =
        opportunity.category ||
        opportunity.type ||
        null;


      const location =
        opportunity.location ||
        context.location ||
        null;


      // -----------------------------------------
      // 4. Reasoning information
      // -----------------------------------------

      const reasoningScore =
        Number(
          rankedItem.reasoningScore
        ) ||
        Number(
          opportunity.reasoningScore
        ) ||
        0;


      const reasoningContribution =
        Number(
          rankedItem.reasoningContribution
        ) || 0;


      const affordabilityScore =
        Number(
          rankedItem.affordabilityScore
        ) || 0;


      const reasoningFactors =
        Array.isArray(
          rankedItem.reasoningFactors
        )
          ? rankedItem.reasoningFactors
          : Array.isArray(
              opportunity.reasoningFactors
            )
              ? opportunity.reasoningFactors
              : [];


      // -----------------------------------------
      // 5. Generate evidence-based match reasons
      // -----------------------------------------

      const matchReasons = [];


      // Goal relevance

      if (
        opportunity.relevance === "high"
      ) {

        matchReasons.push(
          "Strong relevance to your current goal."
        );

      } else if (
        opportunity.relevance === "medium"
      ) {

        matchReasons.push(
          "Relevant to your current goal."
        );

      }


      // Location

      if (
        opportunity.locationMatch === true
      ) {

        const city =
          opportunity.location?.city ||
          context.location?.city;


        if (city) {

          matchReasons.push(
            `Location matches ${city}.`
          );

        } else {

          matchReasons.push(
            "Location matches your request."
          );

        }

      }


      // Budget compatibility

      if (
        opportunity.budgetCompatible === true
      ) {

        const price =
          Number(opportunity.price);

        const budget =
          Number(
            opportunity.budget ??
            context.budget
          );


        if (
          Number.isFinite(price) &&
          Number.isFinite(budget)
        ) {

          matchReasons.push(
            `Within your KSh ${budget.toLocaleString()} budget.`
          );

        } else {

          matchReasons.push(
            "Compatible with your budget."
          );

        }

      }


      // Time compatibility

      if (
        opportunity.timeCompatible === true
      ) {

        matchReasons.push(
          "Compatible with your available time."
        );

      }


      // Preference

      if (
        opportunity.preferenceMatch === true
      ) {

        matchReasons.push(
          "Matches your stated preference."
        );

      }


      // Affordability

      if (
        opportunity.type === "property" &&
        affordabilityScore > 0
      ) {

        const price =
          Number(opportunity.price);

        const budget =
          Number(
            opportunity.budget ??
            context.budget
          );


        if (
          Number.isFinite(price) &&
          Number.isFinite(budget) &&
          price < budget
        ) {

          const remaining =
            budget - price;


          matchReasons.push(
            `Leaves approximately KSh ${remaining.toLocaleString()} within your budget.`
          );

        }

      }


      // Reasoning

      if (
        reasoningScore >= 70
      ) {

        matchReasons.push(
          "The reasoning engine identified strong suitability."
        );

      } else if (
        reasoningScore >= 50
      ) {

        matchReasons.push(
          "The reasoning engine identified good suitability."
        );

      }


      // -----------------------------------------
      // 6. Recommendation explanation
      // -----------------------------------------

      const recommendation =
        opportunity.recommendation ||
        opportunity.reason ||
        description;


      // -----------------------------------------
      // 7. User context
      // -----------------------------------------

      const budget =
        opportunity.budget ??
        context.budget ??
        null;


      const availableTime =
        opportunity.availableTime ??
        context.availableTime ??
        null;


      // -----------------------------------------
      // 8. Return final recommendation
      // -----------------------------------------

      return {

        rank:
          index + 1,

        id:
          opportunity.id ||
          null,

        type:
          opportunity.type ||
          null,

        title:
          title,

        description:
          description,

        category:
          category,

        service:
          opportunity.service ||
          null,

        relevance:
          opportunity.relevance ||
          null,

        reason:
          opportunity.reason ||
          "",

        recommendation:
          recommendation,

        matchReasons:
          matchReasons,

        location:
          location,

        price:
          opportunity.price ??
          null,

        availability:
          opportunity.availability ||
          null,

        score:
          score,

        matchPercentage:
          matchPercentage,

        baseScore:
          Number(
            rankedItem.baseScore
          ) || 0,

        reasoningScore:
          reasoningScore,

        reasoningContribution:
          reasoningContribution,

        reasoningFactors:
          reasoningFactors,

        affordabilityScore:
          affordabilityScore,

        budget:
          budget,

        availableTime:
          availableTime

      };

    }
  );
}


module.exports = {
  formatRecommendations
};
