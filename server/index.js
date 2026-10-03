const { createApp } = require('./app');
const {fromEnvironment}=require('./operations/providers');
const app=createApp({integrations:fromEnvironment()});
const port=Number(process.env.PORT || 3000);
app.server.listen(port,'0.0.0.0',()=>console.log(`Ride2View listening on port ${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
