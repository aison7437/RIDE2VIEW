const {createApp}=require('../../server/app');

// Browser journeys run fixture setup and multiple account sessions through one
// loopback address. Keep that artificial burst separate from production quotas.
// Dedicated HTTP tests exercise the real default quota and authentication limit.
function createBrowserApp(options={}) {
  return createApp({...options,apiRateLimit:10000});
}
module.exports={createBrowserApp};
