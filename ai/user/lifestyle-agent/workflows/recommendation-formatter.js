/**
 * Ride2View Lifestyle Agent
 * Recommendation Formatter
 *
 * Converts ranked opportunities into
 * clean, structured user recommendations.
 */


/**
 * Format ranked opportunities.
 *
 * @param {Array} rankedOpportunities
 * @param {Object} agentContext
 * @returns {Array}
 */
function formatRecommendations(
  rankedOpportunities = [],
  agentContext = {}
) {

  if (!Array.isArray(rankedOpportunities)) {
    return [];
  }

  return rankedOpportunities.map(
    (opportunity, index) => {

      const score =
        Number(
          opportunity?.score ??
          opportunity?.rankingScore ??
          opportunity?.totalScore ??
          0
        ) || 0;


      const title =
        opportunity?.title ??
        opportunity?.name ??
        "Lifestyle Opportunity";


      const description =
        opportunity?.description ??
        opportunity?.summary ??
        "";


      const category =
        opportunity?.category ??
        null;


      const recommendation =
        opportunity?.recommendation ??
        opportunity?.reason ??
        description;


      const reasoningFactors =
        Array.isArray(
          opportunity?.reasoningFactors
        )
          ? opportunity.reasoningFactors
          : [];


      const reasoningScore =
        Number(
          opportunity?.reasoningScore
        ) || 0;


      return {

        rank:
          index + 1,

        id:
          opportunity?.id ?? null,

        title,

        description,

        category,

        location:
          opportunity?.location ??
          agentContext?.location ??
          null,

        score,

        reasoningScore,

        reasoningFactors,

        recommendation,

        budget:
          opportunity?.budget ??
          agentContext?.budget ??
          null,

        availableTime:
          opportunity?.availableTime ??
          agentContext?.availableTime ??
          null

      };

    }
  );
}


/**
 * Export formatter.
 */
module.exports = {
  formatRecommendations
};          opportunity?.reasoningScore
        ) || 0,

      reasoningFactors:
        Array.isArray(
          opportunity?.reasoningFactors
        )
          ? opportunity.reasoningFactors
          : [],

      recommendation:
        opportunity?.recommendation ??
        opportunity?.reason ??
        opportunity?.description ??
        "",

      budget:
        opportunity?.budget ??
        agentContext?.budget ??
        null,

      availableTime:
        opportunity?.availableTime ??
        agentContext?.availableTime ??
        null
    };

  });
}


module.exports = {
  formatRecommendations
};

  // -----------------------------------------
  // 2. Build unified agent context
  // -----------------------------------------

  const agentContext = {

    user,

    userGoal:
      context.userGoal || null,

    goal:
      context.userGoal || null,

    location,

    budget:
      context.budget ?? null,

    availableTime:
      context.availableTime ?? null,

    currentActivity:
      context.currentActivity || null,

    destination:
      context.destination || null
  };


  // -----------------------------------------
  // 3. Discover opportunities
  // -----------------------------------------

  const discoveryResult =
    discoverOpportunities(agentContext);


  const opportunities =
    Array.isArray(discoveryResult?.opportunities)
      ? discoveryResult.opportunities
      : [];


  // -----------------------------------------
  // 4. Reason about opportunities
  // -----------------------------------------

  const rawReasoningResult =
    reasonAboutOpportunities(
      agentContext,
      opportunities
    );


  // Make sure reasoning is always an array.

  const reasoningResult =
    Array.isArray(rawReasoningResult)
      ? rawReasoningResult
      : [];


  // -----------------------------------------
  // 5. Attach reasoning signals
  // -----------------------------------------

  const reasonedOpportunities =
    opportunities.map((opportunity) => {

      const reasoning =
        reasoningResult.find((item) => {

          return (
            item &&
            (
              item.opportunity === opportunity ||
              item.id === opportunity.id
            )
          );

        });


      return {

        ...opportunity,

        reasoningScore:
          Number(
            reasoning?.reasoningScore
          ) || 0,

        reasoningFactors:
          Array.isArray(
            reasoning?.factors
          )
            ? reasoning.factors
            : []
      };

    });


  // -----------------------------------------
  // 6. Score and rank opportunities
  // -----------------------------------------

  const rankedOpportunities =
    rankOpportunities(
      reasonedOpportunities,
      agentContext
    );


  // -----------------------------------------
  // 7. Format recommendations
  // -----------------------------------------

  const formattedRecommendations =
    formatRecommendations(
      rankedOpportunities,
      agentContext
    );


  // -----------------------------------------
  // 8. Return structured result
  // -----------------------------------------

  return {

    success:
      discoveryResult?.success === true,

    agent:
      "ride2view-lifestyle-agent",

    context:
      agentContext,

    discovery: {

      success:
        discoveryResult?.success ?? false,

      count:
        opportunities.length
    },

    reasoning: {

      enabled: true,

      count:
        reasoningResult.length
    },

    ranking: {

      count:
        Array.isArray(rankedOpportunities)
          ? rankedOpportunities.length
          : 0
    },

    recommendations:
      Array.isArray(formattedRecommendations)
        ? formattedRecommendations
        : [],

    timestamp:
      new Date().toISOString()
  };
}


module.exports = {
  generateLifestyleRecommendations
};
