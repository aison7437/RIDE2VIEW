(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let user=null,chosen=null,users=[],recognition=null,refreshGeneration=0;
  const status=message=>{$('app-status').textContent=message;};
  async function api(path,method='GET',body) {
    const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Request failed');return data;
  }
  function node(tag,text,className) {const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
  function button(text,action) {const b=node('button',text);b.type='button';b.addEventListener('click',()=>perform(action,b));return b;}
  async function perform(action,button) {if(button)button.disabled=true;try{await action();}catch(e){status(e.message);}finally{if(button)button.disabled=false;}}
  const formData=form=>Object.fromEntries(new FormData(form));
  function roleUI() {
    $('app-auth').hidden=!!user;$('app-account').hidden=!user;$('app-bookings-section').hidden=!user||user.role==='agent';
    $('app-listings-section').hidden=!user||!['admin','agent'].includes(user.role);$('app-admin').hidden=user?.role!=='admin';$('app-notifications-section').hidden=!user;
    $('app-user').textContent=user?`${user.name} · ${user.role}${user.verified?'':' · awaiting approval'}`:'';
  }
  async function refresh() {
    const token=++refreshGeneration;
    const current=()=>token===refreshGeneration;
    if(user){try{const account=await api('/auth/me');if(!current())return;user=account;}catch{if(!current())return;user=null;status('Sign in to continue.');}}
    roleUI();await window.R2VDashboard?.refresh(user);if(!current())return;
    const modules=['R2VMobility','R2VPropertyServices','R2VOperations','R2VJourney','R2VSupply','R2VMarketplace','R2VAgents','R2VAnalytics'];
    if(!user){for(const name of modules){await window[name]?.refresh(null);if(!current())return;}return;}
    if(user.role==='admin'){const result=await api('/admin/users');if(!current())return;users=result.users;renderUsers();}
    if(['admin','customer','driver'].includes(user.role)){const result=await api('/bookings');if(!current())return;renderBookings(result.bookings);}
    for(const name of modules){await window[name]?.refresh(user);if(!current())return;}
    const notifications=(await api('/notifications')).notifications;if(!current())return;
    $('app-notifications').replaceChildren(...notifications.map(n=>node('p',n.message)));
    if(user.role==='admin'){const result=await api('/admin/audit');if(!current())return;$('app-audit').replaceChildren(...result.events.map(e=>node('p',`${e.created_at} · ${e.action} · ${e.entity_id}`)));}
  }
  function renderResults(items,measurementId=null) {
    $('app-results').replaceChildren();if(!items.length){$('app-results').append(node('p','No approved available listings matched. Try another search or ask an agent to add a listing.'));return;}
    for(const item of items){const card=node('article',null,'app-card');card.append(node('h3',item.title),node('p',`${item.location.city} · KES ${item.price.toLocaleString()}${item.transactionType==='sale'?' purchase':' / month'} · ${item.property?.bedrooms ?? 'Unknown'} bedrooms`),node('p',item.description));
      if(window.R2VMaps){const place=node('details');place.className='r2v-property-map-disclosure';place.append(node('summary','Explore neighborhood · 2D / 3D'));const mapHost=node('div');place.addEventListener('toggle',()=>{if(place.open&&!place.dataset.loaded){place.dataset.loaded='yes';window.R2VMaps.mount(mapHost,{title:item.title,context:'property',points:window.R2VMaps.valid(item.location)?[{role:'property',label:item.title,point:item.location}]:[],allow3d:true});}}, {once:true});if(!window.R2VMaps.valid(item.location))place.append(node('p','Exact property coordinates have not been supplied. The map opens in Nairobi overview mode; no property pin is shown.'));place.append(mapHost);card.append(place);}
      card.append(button('Choose property',async()=>{if(user?.role!=='customer')throw new Error('Sign in with a customer account to book a viewing');chosen=item;const slots=(await api('/properties/'+item.id+'/slots')).slots;$('app-viewing-slots').replaceChildren(...slots.map(s=>{const option=node('option',new Date(s.start_at).toLocaleString()+' – '+new Date(s.end_at).toLocaleTimeString());option.value=s.id;return option;}));if(!slots.length)throw new Error('No available viewing slots. Check again after the agent publishes availability.');if(measurementId)api('/analytics/selection','POST',{searchId:measurementId,listingId:item.id}).catch(()=>{});$('app-chosen').textContent=item.title;$('app-booking-form-section').hidden=false;$('app-booking-form-section').scrollIntoView({behavior:'smooth'});}));if(user?.role==='customer')card.append(button('Save property',async()=>{await api('/customer/saved-properties/'+item.id,'PUT',{});await refresh();}));if(user?.role==='customer')card.append(button('Add to viewing package',()=>window.R2VJourney.addProperty(item)));if(user?.role==='customer')for(const kind of ['remote','diligence'])card.append(button(kind==='remote'?'Remote viewing':'Due diligence',()=>window.R2VPropertyServices.choose(item,kind)));for(const media of item.media||[]){const link=node('a',media.caption||media.kind);link.href=media.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}card.append(node('p','Marketing authority and ownership evidence reviewed; full due diligence is a separate service.'));$('app-results').append(card);}
  }
  function renderBookings(bookings) {
    $('app-bookings').replaceChildren();if(!bookings.length)$('app-bookings').append(node('p','No viewing bookings yet.'));
    for(const b of bookings){const card=node('article',null,'app-card');card.dataset.bookingId=b.id;card.append(node('h3',b.listing.title),node('p',`Viewing: ${new Date(b.scheduled_at).toLocaleString()} · KES ${b.amount} · ${b.tier}`),node('p',`Status: ${b.status} · Payment: ${b.payment_status}`),node('p',`Booking reference: ${b.id}`));
      const actions=node('div',null,'app-actions');
      if(user.role==='admin' && b.status==='requested' && b.payment_status==='pending'){
        const ref=node('input');ref.placeholder='Received transaction reference';ref.setAttribute('aria-label','Transaction reference');
        actions.append(ref,button('Verify received payment',async()=>{await api('/payments/'+b.payment_id+'/verify','POST',{reference:ref.value,amount:b.amount});status('Payment verified against the entered record.');await refresh();}));
      }
      if(user.role==='admin' && b.status==='confirmed'){
        const select=node('select');select.setAttribute('aria-label','Approved driver');for(const d of users.filter(u=>u.role==='driver'&&u.mobilityEligible&&u.online)){const option=node('option',d.name);option.value=d.id;select.append(option);}
        actions.append(select,button('Offer viewing to driver',async()=>{if(!select.value)throw new Error('Approve a driver account first');await api('/bookings/'+b.id+'/assign','POST',{driverId:select.value,idempotencyKey:'ui-offer-'+crypto.randomUUID()});status('Viewing offered to driver. Assignment is pending driver acceptance.');await refresh();}));
      }
      if(user.role==='driver'&&b.assignment_status==='OFFERED'&&b.assignment_id){actions.append(button('Accept viewing',async()=>{await api('/dispatch/'+b.assignment_id+'/accept','POST',{});status('Viewing accepted. You are now assigned to this journey.');await refresh();}),button('Reject viewing',async()=>{await api('/dispatch/'+b.assignment_id+'/reject','POST',{});status('Viewing offer rejected.');await refresh();}));}
      if(['admin','driver'].includes(user.role)&&b.status==='assigned'&&!b.journey_id)actions.append(button('Complete viewing',async()=>{await api('/bookings/'+b.id+'/complete','POST',{});status('Viewing completed.');await refresh();}));
      if(['admin','customer'].includes(user.role)&&!['completed','cancelled'].includes(b.status)&&!b.journey_id)actions.append(button('Cancel viewing',async()=>{await api('/bookings/'+b.id+'/cancel','POST',{});status('Viewing cancelled. Paid amounts require refund review.');await refresh();}));
      if(b.status==='requested'&&user.role==='customer')card.append(node('p','Payment is pending. Contact Ride2View operations for payment instructions; no external payment gateway is connected.'));
      if(b.journey_id)card.append(node('p','Manage all stops, cancellation and rescheduling in Viewing packages below.'));card.append(actions);$('app-bookings').append(card);
    }
  }
  function renderUsers(){const target=$('app-users');target.replaceChildren();for(const u of users){const row=node('div',null,'app-card');row.append(node('p',`${u.name} · ${u.email} · ${u.role} · ${u.verified?'Approved':'Pending'}`));if(u.role==='driver')row.append(node('p',`Documentary eligibility: ${u.mobilityEligible?'Current':'Requires review'} · ${u.online?'Online':'Offline'}`));target.append(row);}}
  $('app-auth-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{user=await api('/auth/login','POST',formData(e.target));status('Signed in.');await refresh();});});
  $('app-register').addEventListener('click',()=>perform(async()=>{const data=formData($('app-auth-form'));await api('/auth/register','POST',data);user=await api('/auth/login','POST',data);status('Account created. Agent and driver accounts need administrator approval.');await refresh();}));
  $('app-logout').addEventListener('click',()=>perform(async()=>{await api('/auth/logout','POST',{});user=null;chosen=null;$('app-booking-form-section').hidden=true;$('app-results').replaceChildren();await refresh();status('Signed out.');}));
  $('app-search').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{const data=formData(e.target);if(!data.budget)delete data.budget;const result=await api('/search','POST',data);renderResults(result.recommendations||[],result.measurementId);status(result.summary||'Search completed.');});});
  $('app-booking-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{if(!chosen)throw new Error('Choose a property first');const d=formData(e.target);await api('/viewing-requests','POST',{listingId:chosen.id,tier:d.tier,slotId:d.slotId,idempotencyKey:crypto.randomUUID()});status('Viewing requested. Awaiting agent acceptance.');$('app-booking-form-section').hidden=true;await refresh();});});
  $('app-listing-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{const d=formData(e.target);await api('/listings','POST',{title:d.title,description:d.description,price:Number(d.price),transactionType:d.transactionType,location:{city:d.city,...(d.latitude!==''&&d.longitude!==''?{latitude:Number(d.latitude),longitude:Number(d.longitude)}:{})},property:{bedrooms:Number(d.bedrooms)},timing:{duration:d.duration?Number(d.duration):null}});status('Property draft created. Submit marketing and ownership evidence, then request publication review.');e.target.reset();await refresh();});});
  $('app-refresh').addEventListener('click',()=>perform(refresh));$('app-preview').addEventListener('click',()=>{$('app-workspace').hidden=true;});
  function openVoice() {$('app-workspace').hidden=false;$('voice-overlay').hidden=false;$('voice-status').textContent='Speak a property search. Review it before searching.';}
  window.R2V={openVoice,showListings:renderResults,api,node,button,perform,status,refresh,getUser:()=>user};$('app-voice').addEventListener('click',openVoice);
  $('app-voice-close').addEventListener('click',()=>{recognition?.stop();$('voice-overlay').hidden=true;});
  $('app-listen').addEventListener('click',()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){$('voice-status').textContent='Voice recognition is unavailable in this browser. Type your search instead.';return;}recognition?.stop();recognition=new Speech();recognition.lang='en-KE';recognition.onresult=e=>{const text=e.results[0][0].transcript;$('voice-transcript').textContent=text;$('app-search').elements.message.value=text;$('voice-status').textContent='Search captured. Close this panel and press Search.';};recognition.onerror=e=>{$('voice-status').textContent='Voice input failed: '+e.error;};recognition.start();$('voice-status').textContent='Listening…';});

  // Customer search: keyboard, speech dictation, and assisted voice share the same search form.
  function installDualSearch() {
    const form=$('app-search'), message=form?.elements.message;
    if(!form||!message)return;
    const style=document.createElement('style');
    style.textContent=`.r2v-dual-search{display:flex;align-items:center;gap:8px;background:#242729;color:white;border-radius:999px;padding:8px 10px;max-width:100%;box-sizing:border-box}.r2v-dual-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:white;padding:8px;font:inherit}.r2v-dual-search button{border:0;cursor:pointer;display:grid;place-items:center;flex-shrink:0;width:42px;height:42px;border-radius:50%;background:#424646;color:white;font-size:21px}.r2v-dual-search button.r2v-ai-voice{background:#c4f000;color:#111;font-weight:700}.r2v-dual-search button:focus-visible{outline:3px solid #fff;outline-offset:2px}.r2v-dual-hint{font-size:12px;margin:6px 0;color:inherit}.r2v-dual-search button[aria-pressed="true"]{box-shadow:0 0 0 3px #c4f000}`;
    document.head.append(style);
    const parent=message.parentElement,bar=document.createElement('div');bar.className='r2v-dual-search';bar.setAttribute('role','search');
    message.replaceWith(bar);bar.append(message);message.placeholder='Search properties, areas or services…';message.setAttribute('aria-label','Describe the property you want');
    const mic=node('button','🎙');mic.type='button';mic.title='Dictate search';mic.setAttribute('aria-label','Dictate search');mic.setAttribute('aria-pressed','false');
    const ai=node('button','▥','r2v-ai-voice');ai.type='button';ai.title='AI-assisted voice search';ai.setAttribute('aria-label','AI-assisted voice search');ai.setAttribute('aria-pressed','false');bar.append(mic,ai);
    const hint=node('p','Type or dictate a search. AI Voice helps you describe what you need; review before submitting.','r2v-dual-hint');parent.append(hint);
    let active=null;
    function listen(mode){
      if(active){active.stop();active=null;mic.setAttribute('aria-pressed','false');ai.setAttribute('aria-pressed','false');hint.textContent='Listening stopped. Review your query.';return;}
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech){hint.textContent='Speech recognition is not supported here. Please type your request.';message.focus();return;}
      const instance=new Speech();active=instance;instance.lang='en-KE';instance.interimResults=false;instance.maxAlternatives=1;
      const control=mode==='ai'?ai:mic;control.setAttribute('aria-pressed','true');hint.textContent=mode==='ai'?'Listening for your property preferences…':'Listening for search terms…';
      instance.onresult=e=>{message.value=e.results[0][0].transcript;message.dispatchEvent(new Event('input',{bubbles:true}));hint.textContent=mode==='ai'?'AI-assisted request captured. Review and press Search to see matching listings.':'Speech captured. Review and press Search.';message.focus();};
      instance.onerror=e=>{hint.textContent=e.error==='not-allowed'?'Microphone access denied. Type your search instead.':'Voice recognition unavailable ('+e.error+'). Type your search instead.';};
      instance.onend=()=>{active=null;control.setAttribute('aria-pressed','false');};
      try{instance.start();}catch{active=null;control.setAttribute('aria-pressed','false');hint.textContent='Could not start the microphone. Type your search instead.';}
    }
    mic.addEventListener('click',()=>listen('dictation'));ai.addEventListener('click',()=>listen('ai'));
    // Preview search bars remain navigational, but each voice button opens the real connected search.
    document.querySelectorAll('.search-bar').forEach(bar=>{
      const existing=bar.querySelector('.search-mic');if(!existing)return;
      existing.setAttribute('role','button');existing.setAttribute('tabindex','0');existing.setAttribute('aria-label','Dictate a property search');
      const open=e=>{e.stopPropagation();$('app-workspace').hidden=false;$('voice-overlay').hidden=true;$('app-discovery').scrollIntoView({behavior:'smooth'});listen('dictation');};
      existing.addEventListener('click',open,true);existing.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}});
      const aiButton=node('button','▥','r2v-ai-voice');aiButton.type='button';aiButton.setAttribute('aria-label','AI-assisted voice search');aiButton.title='AI-assisted voice search';
      aiButton.style.cssText='background:#c4f000;color:#111;border:0;border-radius:50%;width:36px;height:36px;cursor:pointer;flex-shrink:0';
      aiButton.addEventListener('click',e=>{e.stopPropagation();$('app-workspace').hidden=false;$('voice-overlay').hidden=true;$('app-discovery').scrollIntoView({behavior:'smooth'});listen('ai');});bar.append(aiButton);
    });
  }
  installDualSearch();
  perform(async()=>{const config=await api('/config');for(const [tier,price]of Object.entries(config.tiers)){const option=node('option',`${tier} · KES ${price}`);option.value=tier;$('app-tiers').append(option);}try{user=await api('/auth/me');}catch{user=null;}await refresh();status('Ready. Search approved listings or sign in.');});
})();
