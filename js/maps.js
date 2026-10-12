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
 const PREFERENCE_KEY='r2v.map.spatial.preference.v1';
 function readPreference(){
  try{const value=JSON.parse(localStorage.getItem(PREFERENCE_KEY)||'null');return value&&value.remember===true&&['2d','3d'].includes(value.mode)?value.mode:null;}catch{return null;}
 }
 function savePreference(mode,remember){
  try{if(remember)localStorage.setItem(PREFERENCE_KEY,JSON.stringify({mode,remember:true}));else localStorage.removeItem(PREFERENCE_KEY);}catch{/* Blocked storage must never block maps. */}
 }
 function mount(host,{points=[],title='Location preview',allow3d=true,context='trip'}={}){
  const section=element('section','r2v-map-panel r2v-map-spatial');
  const stage=element('div','r2v-map-stage');
  const top=element('div','r2v-spatial-top');
  const label=element('div','r2v-spatial-brand');
  label.append(element('span','r2v-spatial-brandmark','✦'));
  const headings=element('div');headings.append(element('strong',null,'RIDE2VIEW'),element('small',null,'SPATIAL MAPS'));label.append(headings);
  const pill=element('span','r2v-spatial-live',context==='property'?'EXPLORE NEIGHBORHOOD':'SPATIAL MAPS');
  top.append(label,pill);
  const caption=element('div','r2v-spatial-caption');
  caption.append(element('small',null,context==='property'?'EXPLORE YOUR NEIGHBORHOOD':'YOUR JOURNEY'),element('strong',null,title));
  const controls=element('div','r2v-map-controls');
  controls.setAttribute('role','group');controls.setAttribute('aria-label','Map perspective');
  const footer=element('div','r2v-spatial-footer');
  const preference=element('label','r2v-spatial-remember');
  const rememberBox=element('input');rememberBox.type='checkbox';
  const preferenceText=element('span');preferenceText.append(element('strong',null,'Remember my view'),element('small',null,'Use my preferred perspective next time'));
  preference.append(rememberBox,preferenceText);
  const hint=element('p','r2v-spatial-hint','A new perspective, one tap away.');
  const stored=readPreference();
  let remember=stored!==null,mode=allow3d&&stored==='3d'?'3d':'2d',generation=0,destroyed=false;
  rememberBox.checked=remember;
  const buttons=[];
  function setButtons(){for(const b of buttons){const active=b.dataset.mapMode===mode;b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-active',active);}hint.textContent=mode==='3d'?'Explore buildings and the surrounding neighborhood.':'Clear navigation, beautifully simple.';}
  function draw(){
   const current=++generation;
   // Render into a detached frame; a slow earlier request must never replace a newer choice.
   const next=element('div','r2v-map-frame');
   next.setAttribute('aria-label',mode==='3d'?'3D neighborhood map':'2D navigation map');
   next.style.visibility='hidden';
   stage.append(next);
   render(next,{points,mode}).then(ok=>{
    if(destroyed||current!==generation){next.remove();return;}
    next.style.visibility='visible';
    for(const old of stage.querySelectorAll('.r2v-map-frame'))if(old!==next)old.remove();
    if(!ok&&mode==='3d'){
     mode='2d';setButtons();hint.textContent='3D is unavailable here. Continuing with the standard map.';
     savePreference(mode,remember);draw();
    }
   }).catch(()=>{next.remove();});
  }
  function addButton(value,textLabel,icon){
   const b=element('button','r2v-spatial-option');
   b.type='button';b.dataset.mapMode=value;
   b.append(element('span','r2v-spatial-option-icon',icon),element('span',null,textLabel));
   b.addEventListener('click',()=>{if(mode===value)return;mode=value;setButtons();savePreference(mode,remember);draw();});
   controls.append(b);buttons.push(b);
  }
  addButton('2d','2D Classic','▤');
  if(allow3d)addButton('3d','3D Spatial','▧');
  rememberBox.addEventListener('change',()=>{remember=rememberBox.checked;savePreference(mode,remember);});
  footer.append(controls,preference,hint);
  stage.append(top,caption);section.append(stage,footer);
  host.append(section);setButtons();draw();
  return {update(next){points=next;draw();},destroy(){destroyed=true;generation++;section.remove();}};
 }

 window.R2VMaps={mount,render,valid};
})();
