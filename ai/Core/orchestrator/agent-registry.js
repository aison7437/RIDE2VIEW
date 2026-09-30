const lifestyle = require('../../user/lifestyle-agent');
const agents = Object.freeze({ 'lifestyle-agent': lifestyle });
module.exports = { agents, getAgent: name => agents[name] || null };
