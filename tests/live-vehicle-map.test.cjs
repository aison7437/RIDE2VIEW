const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('vehicle map helper shows cars only for fresh authenticated trip coordinates',()=>{
 const code=fs.readFileSync(require('node:path').join(__dirname,'../js/maps.js'),'utf8');
 const ctx={window:{},Date,Number,Math,encodeURIComponent,URLSearchParams};vm.runInNewContext(code,ctx);
 const {liveVehicle,bearing}=ctx.window.R2VMaps;
 const point={latitude:-1.28,longitude:36.82,capturedAt:new Date().toISOString(),stale:false};
 assert.equal(liveVehicle(point),true);
 assert.equal(liveVehicle({...point,stale:true}),false);
 assert.equal(liveVehicle({...point,capturedAt:new Date(Date.now()-120000).toISOString()}),false);
 assert.equal(liveVehicle({...point,latitude:200}),false);
 assert.equal(liveVehicle({...point,capturedAt:'invalid'}),false);
 assert.ok(Math.abs(bearing({latitude:-1.28,longitude:36.82},{latitude:-1.28,longitude:36.83})-90)<1);
});
