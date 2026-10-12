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

test('map pins require real coordinates and interpolation never extrapolates',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../js/maps.js'),'utf8');
 const ctx={window:{},Date,Number,Math,encodeURIComponent,URLSearchParams};vm.runInNewContext(source,ctx);
 const {valid,interpolateVehicle}=ctx.window.R2VMaps;
 assert.equal(valid({latitude:null,longitude:36.82}),false);
 assert.equal(valid({latitude:'',longitude:''}),false);
 const a={latitude:-1.28,longitude:36.82,accuracy:10,capturedAt:new Date(Date.now()-15000).toISOString(),stale:false};
 const b={latitude:-1.28,longitude:36.83,accuracy:12,capturedAt:new Date().toISOString(),stale:false};
 const midway=interpolateVehicle(a,b,.5);
 assert.ok(Math.abs(midway.longitude-36.825)<.00001);
 assert.equal(interpolateVehicle(a,b,2).longitude,Number(b.longitude));
 assert.equal(interpolateVehicle(a,{...b,stale:true},.5),null);
 assert.equal(interpolateVehicle(a,{...b,accuracy:500},.5),null);
});
