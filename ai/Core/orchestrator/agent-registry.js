const lifestyle = require('../../user/lifestyle-agent');
// Legacy Core/orchestrator serves the existing /api/search contract. Keep its
// Lifestyle route on the legacy recommendation workflow while the newer
// Journey Orchestrator consumes Lifestyle Intelligence v2 via execute().
const lifestyleSearchAdapter = Object.freeze({
  generateLifestyleRecommendations: lifestyle.generateLifestyleRecommendations
});
const agents = Object.freeze({ 'lifestyle-agent': lifestyleSearchAdapter });
module.exports = { agents, getAgent: name => agents[name] || null };
