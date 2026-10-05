const { randomUUID } = require('node:crypto');
const { createJourney, NODE_STATUS } = require('./models/journey');
const { validateGraph, getReadyNodes, blockDependents } = require('./graph/journey-graph');
const { createRegistry } = require('./agents/registry');
const { executeWithPolicy } = require('./core/execution-engine');
const { InMemoryJourneyStore } = require('./state/journey-store');
const { buildPropertyViewingWorkflow } = require('./workflows/property-viewing.workflow');
const { buildPropertyDiscoveryWorkflow } = require('./workflows/property-discovery.workflow');
const { buildJourneyDebugView } = require('./observability/journey-debugger');

class JourneyOrchestrator {
  constructor(options = {}) {
    this.registry = options.registry || createRegistry(options.adapters || {});
    this.store = options.store || new InMemoryJourneyStore();
    this.maxConcurrency = Math.max(1, options.maxConcurrency || 4);
  }

  async plan(input = {}) {
    const workflow = input.workflow==='property-discovery' ? buildPropertyDiscoveryWorkflow(input) : buildPropertyViewingWorkflow(input);
    const journey = createJourney({
      id: input.journeyId || `JRN-${randomUUID()}`,
      intent: input.intent || { type: 'property_viewing', raw: input.message || input.searchText || '' },
      nodes: workflow.nodes
    });
    validateGraph(journey);
    await this.store.save(journey);
    return journey;
  }

  async run(input = {}) {
    // Resuming must preserve identity, outputs and terminal node states.
    const journey = input.journey_id ? structuredClone(input) : input.nodes ? createJourney(input) : await this.plan(input);
    validateGraph(journey);
    let progressed = true;
    while (progressed) {
      progressed = false;
      const ready = getReadyNodes(journey).slice(0, this.maxConcurrency);
      if (!ready.length) break;
      progressed = true;
      const results = await Promise.all(ready.map(node => executeWithPolicy({
        journey, node, registry: this.registry, store: this.store
      })));
      for (const result of results) {
        if (result.status === NODE_STATUS.FAILED) blockDependents(journey, result.node_id, result.failure);
      }
      await this.store.save(journey);
    }
    journey.updated_at = new Date().toISOString();
    journey.completed = journey.nodes.every(n => [NODE_STATUS.SUCCESS, NODE_STATUS.SKIPPED, NODE_STATUS.CANCELLED].includes(n.status));
    journey.debug = buildJourneyDebugView(journey);
    await this.store.save(journey);
    return journey;
  }

  async resume(journeyId) {
    const journey = await this.store.get(journeyId);
    if (!journey) throw new Error(`Journey not found: ${journeyId}`);
    return this.run(journey);
  }
}

module.exports = { JourneyOrchestrator, NODE_STATUS };