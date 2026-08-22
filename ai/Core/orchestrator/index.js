/**
 * RIDE2VIEW AI
 * Core Orchestrator
 *
 * Purpose:
 * -------
 * System-level coordination layer for RIDE2VIEW AI agents.
 *
 * Responsibilities:
 * 1. Receive a normalized user request/context.
 * 2. Determine which specialist agent(s) should handle it.
 * 3. Resolve agents through the agent registry.
 * 4. Execute the selected agent workflow.
 * 5. Return a consistent orchestration result.
 *
 * Architecture:
 *
 * User Request
 *      ↓
 * Core Orchestrator
 *      ↓
 * Intent / Routing
 *      ↓
 * Specialist Agent
 *      ↓
 * Agent Workflow
 *      ↓
 * Unified Result
 *
 * IMPORTANT:
 * This file is NOT the Lifestyle Agent.
 *
 * Lifestyle-specific reasoning belongs inside:
 *
 * ai/user/lifestyle-agent/
 *
 * The orchestrator coordinates agents.
 */


/* =========================================================
   IMPORTS
========================================================= */

let agentRegistry = null;

try {
  agentRegistry = require("./agent-registry");
} catch (error) {
  /*
   * The orchestrator remains loadable even while the
   * registry is being developed.
   *
   * This makes the core layer easier to integrate
   * incrementally.
   */
  agentRegistry = null;
}


/* =========================================================
   CONSTANTS
========================================================= */

const ORCHESTRATOR_NAME =
  "ride2view-ai-orchestrator";


const ORCHESTRATOR_VERSION =
  "1.0.0";


/* =========================================================
   UTILITY: OBJECT CHECK
========================================================= */

function isObject(value) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


/* =========================================================
   CONTEXT NORMALIZATION
========================================================= */

/**
 * Converts different request shapes into one internal
 * context structure.
 *
 * Supported examples:
 *
 * {
 *   searchText: "find a house in Nairobi"
 * }
 *
 * {
 *   query: "find me a property"
 * }
 *
 * {
 *   userRequest: "I need transport"
 * }
 */
function normalizeContext(input = {}) {

  if (typeof input === "string") {

    return {
      searchText: input
    };

  }


  if (!isObject(input)) {

    return {
      searchText: ""
    };

  }


  const searchText =
    input.searchText ??
    input.query ??
    input.userRequest ??
    input.request ??
    input.goal ??
    input.userGoal ??
    "";


  return {

    ...input,

    searchText:
      String(searchText)

  };

}


/* =========================================================
   INTENT ROUTING
========================================================= */

/**
 * Determines which specialist domains appear relevant.
 *
 * This is deliberately deterministic for the foundation
 * layer. A learned/LLM router can replace or augment this
 * later.
 */
function determineAgents(context = {}) {

  const text =
    String(
      context.searchText || ""
    ).toLowerCase();


  const agents = [];


  /*
   * PROPERTY
   */
  if (
    /property|house|home|apartment|villa|mansion|rent|buy|bedroom|accommodation/.test(
      text
    )
  ) {

    agents.push(
      "lifestyle-agent"
    );

  }


  /*
   * MOBILITY
   */
  if (
    /ride|transport|taxi|driver|pickup|drop.?off|get me there|mobility/.test(
      text
    )
  ) {

    agents.push(
      "mobility-agent"
    );

  }


  /*
   * FOOD
   */
  if (
    /food|restaurant|meal|lunch|dinner|breakfast|eat|delivery/.test(
      text
    )
  ) {

    agents.push(
      "food-agent"
    );

  }


  /*
   * MARKETPLACE / COMMERCE
   */
  if (
    /buy|purchase|shop|product|marketplace|order/.test(
      text
    )
  ) {

    agents.push(
      "marketplace-agent"
    );

  }


  /*
   * CUSTOMER SUPPORT
   */
  if (
    /help|problem|issue|complaint|support|refund|cancel/.test(
      text
    )
  ) {

    agents.push(
      "customer-support-agent"
    );

  }


  /*
   * DEFAULT
   *
   * Lifestyle Agent is currently the primary general
   * user-facing intelligence layer.
   */
  if (agents.length === 0) {

    agents.push(
      "lifestyle-agent"
    );

  }


  /*
   * Remove duplicates while preserving order.
   */
  return [
    ...new Set(agents)
  ];

}


/* =========================================================
   AGENT RESOLUTION
========================================================= */

/**
 * Attempts to resolve an agent from the registry.
 *
 * The registry can expose agents in several reasonable
 * forms:
 *
 * registry.getAgent(name)
 *
 * registry.agents[name]
 *
 * registry[name]
 */
function resolveAgent(name) {

  if (!agentRegistry) {

    return null;

  }


  /*
   * Preferred registry API.
   */
  if (
    typeof agentRegistry.getAgent ===
    "function"
  ) {

    const agent =
      agentRegistry.getAgent(name);

    if (agent) {

      return agent;

    }

  }


  /*
   * Registry object.
   */
  if (
    agentRegistry.agents &&
    agentRegistry.agents[name]
  ) {

    return (
      agentRegistry.agents[name]
    );

  }


  /*
   * Direct export.
   */
  if (
    agentRegistry[name]
  ) {

    return (
      agentRegistry[name]
    );

  }


  return null;

}


/* =========================================================
   AGENT EXECUTION
========================================================= */

/**
 * Executes a resolved specialist agent.
 *
 * The orchestrator supports common agent entry points:
 *
 * agent.run(context)
 * agent.execute(context)
 * agent.generateLifestyleRecommendations(context)
 */
async function executeAgent(
  agent,
  context
) {

  if (!agent) {

    return {

      success: false,

      error:
        "Agent could not be resolved."

    };

  }


  /*
   * Generic run API.
   */
  if (
    typeof agent.run ===
    "function"
  ) {

    return await agent.run(
      context
    );

  }


  /*
   * Generic execute API.
   */
  if (
    typeof agent.execute ===
    "function"
  ) {

    return await agent.execute(
      context
    );

  }


  /*
   * Lifestyle Agent compatibility.
   */
  if (
    typeof agent.generateLifestyleRecommendations ===
    "function"
  ) {

    return agent.generateLifestyleRecommendations(
      context
    );

  }


  /*
   * Direct function export.
   */
  if (
    typeof agent ===
    "function"
  ) {

    return await agent(
      context
    );

  }


  return {

    success: false,

    error:
      "Resolved agent does not expose a supported execution method."

  };

}


/* =========================================================
   SINGLE AGENT ROUTE
========================================================= */

async function routeToAgent(
  agentName,
  context
) {

  const agent =
    resolveAgent(
      agentName
    );


  if (!agent) {

    return {

      success: false,

      agent:
        agentName,

      status:
        "unavailable",

      error:
        `Agent "${agentName}" is not registered.`

    };

  }


  try {

    const result =
      await executeAgent(
        agent,
        context
      );


    return {

      success:
        result?.success !== false,

      agent:
        agentName,

      status:
        "completed",

      result

    };

  } catch (error) {

    return {

      success: false,

      agent:
        agentName,

      status:
        "failed",

      error:
        error.message

    };

  }

}


/* =========================================================
   MAIN ORCHESTRATOR
========================================================= */

/**
 * Main RIDE2VIEW orchestration entry point.
 *
 * Example:
 *
 * const result =
 *   await orchestrate({
 *     searchText:
 *       "find me a property in Nairobi and help me get there"
 *   });
 */
async function orchestrate(
  input = {}
) {

  const startedAt =
    Date.now();


  console.log(
    "[RIDE2VIEW Orchestrator] Starting."
  );


  /*
   * Normalize request.
   */
  const context =
    normalizeContext(
      input
    );


  /*
   * Determine relevant agents.
   */
  const selectedAgents =
    determineAgents(
      context
    );


  console.log(
    "[RIDE2VIEW Orchestrator] Agents selected:",
    selectedAgents
  );


  /*
   * Execute selected agents sequentially.
   *
   * Sequential execution is intentional for the
   * foundation layer because later agents may eventually
   * consume outputs from earlier agents.
   */
  const results = [];


  for (
    const agentName
    of selectedAgents
  ) {

    const agentResult =
      await routeToAgent(
        agentName,
        context
      );


    results.push(
      agentResult
    );

  }


  /*
   * Determine overall success.
   */
  const successfulAgents =
    results.filter(
      result =>
        result.success
    );


  const failedAgents =
    results.filter(
      result =>
        !result.success
    );


  const durationMs =
    Date.now() -
    startedAt;


  /*
   * Primary result.
   */
  const primaryResult =
    successfulAgents.length > 0
      ? successfulAgents[0]
      : null;


  const overallSuccess =
    successfulAgents.length > 0;


  /*
   * Final orchestration contract.
   */
  const orchestrationResult = {

    success:
      overallSuccess,

    orchestrator:
      ORCHESTRATOR_NAME,

    version:
      ORCHESTRATOR_VERSION,

    context,

    routing: {

      selectedAgents,

      count:
        selectedAgents.length

    },

    results,

    primary:
      primaryResult,

    summary:
      overallSuccess
        ? "RIDE2VIEW AI orchestration completed successfully."
        : "No selected RIDE2VIEW AI agent completed successfully.",

    diagnostics: {

      successfulAgents:
        successfulAgents.length,

      failedAgents:
        failedAgents.length,

      duration
