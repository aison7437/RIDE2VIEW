(() => {
 'use strict';
 // Google Maps keys are public browser identifiers. Restrict yours by HTTP referrer and API.
 const DEFAULT={latitude:-1.286389,longitude:36.817223};
 let configPromise=null,loaderPromise=null;
 const valid=p=>p&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))&&Math.abs(Number(p.latitude))<=90&&Math.abs(Number(p.longitude))<=180;
 const latLng=p=>({lat:Number(p.latitude),lng:Number(p.longitude)});
 const element=(tag,klass,text)=>{const e=document.createElement(tag);if(klass)e.className=klass;if(text)e.textContent=text;return e;};
 function config(){return configPromise||(configPromise=fetch('/api/maps/config',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('Map configuration unavailable');return r.json();}).catch(()=>({enabled:false}))); }
 function load(key){
  if(loaderPromise)return loaderPromise;
  loaderPromise=new Promise((resolve,reject)=>{
   if(window.google?.maps?.importLibrary)return resolve(window.google.maps);
   const callback='__r2vMapsReady';
   window[callback]=()=>{delete window[callback];resolve(window.google.maps);};
   const script=document.createElement('script');
   const query=new URLSearchParams({key,v:'weekly',loading:'async',callback});
   script.src='https://maps.googleapis.com/maps/api/js?'+query;
   script.async=true;script.onerror=()=>{delete window[callback];loaderPromise=null;reject(new Error('Google Maps failed to load'));};
   document.head.append(script);
  });
  return loaderPromise;
 }
 function fallback(target,reason,points){
  target.replaceChildren();
  const panel=element('div','r2v-map-fallback');
  panel.append(element('p',null,reason),element('p',null,'Street maps and 3D previews require Google Maps browser configuration. Existing trip operations continue working.'));
  const destination=points.find(p=>valid(p.point)&&p.role==='destination')||points.find(p=>valid(p.point));
  if(destination){const link=element('a',null,'Open location in Google Maps ↗');link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(destination.point.latitude+','+destination.point.longitude);link.target='_blank';link.rel='noopener noreferrer';panel.append(link);}
  target.append(panel);
 }
 async function render(target,{points=[],mode='2d',onModeChange,autoCenter=DEFAULT}={}){
  const clean=points.filter(p=>valid(p.point));const center=clean.find(p=>p.role==='property'||p.role==='destination')?.point||clean[0]?.point||autoCenter;
  target.replaceChildren(element('p',null,'Loading map…'));
  const settings=await config();
  if(!settings.enabled||!settings.browserKey){fallback(target,'Interactive Google Maps is not configured.',clean);return false;}
  try{
   const maps=await load(settings.browserKey);
   if(mode==='3d'){
    const {Map3DElement}=await maps.importLibrary('maps3d');
    const m=new Map3DElement({center:{...latLng(center),altitude:380},tilt:65,heading:0,mode:'HYBRID'});
    m.style.width='100%';m.style.height='100%';m.setAttribute('aria-label','3D neighborhood map');
    const {Marker3DElement}=await maps.importLibrary('maps3d');
    for(const p of clean){const marker=new Marker3DElement({position:{...latLng(p.point),altitude:0},label:p.label||p.role||'Location'});m.append(marker);}
    target.replaceChildren(m);
   }else{
    const {Map}=await maps.importLibrary('maps');
    const m=new Map(target,{center:latLng(center),zoom:14,mapTypeControl:false,streetViewControl:false,fullscreenControl:true});
    const bounds=new maps.LatLngBounds();
    for(const p of clean){new maps.Marker({position:latLng(p.point),map:m,title:p.label||p.role||'Location'});bounds.extend(latLng(p.point));}
    if(clean.length>1)m.fitBounds(bounds,60);
   }
   return true;
  }catch(error){
   fallback(target,'Google '+(mode==='3d'?'3D':'2D')+' map is unavailable: '+error.message,clean);
   return false;
  }
 }
 function mount(host,{points=[],title='Location preview',allow3d=true}={}){
  const section=element('section','r2v-map-panel');
  const header=element('div','r2v-map-toolbar');
  header.append(element('strong',null,title));
  const controls=element('div','r2v-map-controls'),viewport=element('div','r2v-map-viewport');
  let mode='2d',generation=0;
  function draw(){const current=++generation;const snapshot=points;render(viewport,{points:snapshot,mode}).then(()=>{if(current!==generation)return;});}
  function button(label,value){const b=element('button',null,label);b.type='button';b.dataset.mapMode=value;b.setAttribute('aria-pressed',String(mode===value));b.addEventListener('click',()=>{mode=value;for(const x of controls.querySelectorAll('button'))x.setAttribute('aria-pressed',String(x.dataset.mapMode===mode));draw();});controls.append(b);}
  button('2D map','2d');if(allow3d)button('3D preview','3d');
  header.append(controls);section.append(header,viewport);
  host.append(section);draw();
  return {update(next){points=next;draw();},destroy(){generation++;section.remove();}};
 }
 window.R2VMaps={mount,render,valid};
})();
