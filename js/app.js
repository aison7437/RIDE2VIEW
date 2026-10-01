(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let user=null,chosen=null,users=[],recognition=null;
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
    roleUI();if(!user)return;
    if(user.role==='admin'){users=(await api('/admin/users')).users;renderUsers();}
    if(['admin','customer','driver'].includes(user.role))renderBookings((await api('/bookings')).bookings);
    if(['admin','agent'].includes(user.role))renderListings((await api('/listings?mine=true')).listings);
    const notifications=(await api('/notifications')).notifications;$('app-notifications').replaceChildren(...notifications.map(n=>node('p',n.message)));
    if(user.role==='admin'){$('app-audit').replaceChildren(...(await api('/admin/audit')).events.map(e=>node('p',`${e.created_at} · ${e.action} · ${e.entity_id}`)));}
  }
  function renderResults(items) {
    $('app-results').replaceChildren();if(!items.length){$('app-results').append(node('p','No approved available listings matched. Try another search or ask an agent to add a listing.'));return;}
    for(const item of items){const card=node('article',null,'app-card');card.append(node('h3',item.title),node('p',`${item.location.city} · KES ${item.price.toLocaleString()} / month · ${item.property?.bedrooms ?? 'Unknown'} bedrooms`),node('p',item.description));
      card.append(button('Choose property',()=>{if(user?.role!=='customer')throw new Error('Sign in with a customer account to book a viewing');chosen=item;$('app-chosen').textContent=item.title;$('app-booking-form-section').hidden=false;$('app-booking-form-section').scrollIntoView({behavior:'smooth'});}));$('app-results').append(card);}
  }
  function renderBookings(bookings) {
    $('app-bookings').replaceChildren();if(!bookings.length)$('app-bookings').append(node('p','No viewing bookings yet.'));
    for(const b of bookings){const card=node('article',null,'app-card');card.dataset.bookingId=b.id;card.append(node('h3',b.listing.title),node('p',`Viewing: ${new Date(b.scheduled_at).toLocaleString()} · KES ${b.amount} · ${b.tier}`),node('p',`Status: ${b.status} · Payment: ${b.payment_status}`),node('p',`Booking reference: ${b.id}`));
      const actions=node('div',null,'app-actions');
      if(user.role==='admin' && b.status==='requested'){
        const ref=node('input');ref.placeholder='Received transaction reference';ref.setAttribute('aria-label','Transaction reference');
        actions.append(ref,button('Verify received payment',async()=>{await api('/payments/'+b.payment_id+'/verify','POST',{reference:ref.value,amount:b.amount});status('Payment verified against the entered record.');await refresh();}));
      }
      if(user.role==='admin' && b.status==='confirmed'){
        const select=node('select');select.setAttribute('aria-label','Approved driver');for(const d of users.filter(u=>u.role==='driver'&&u.verified)){const option=node('option',d.name);option.value=d.id;select.append(option);}
        actions.append(select,button('Offer viewing to driver',async()=>{if(!select.value)throw new Error('Approve a driver account first');await api('/bookings/'+b.id+'/assign','POST',{driverId:select.value,idempotencyKey:'ui-offer-'+b.id+'-'+select.value});status('Viewing offered to driver. Assignment is pending driver acceptance.');await refresh();}));
      }
      if(user.role==='driver'&&b.assignment_status==='OFFERED'&&b.assignment_id){actions.append(button('Accept viewing',async()=>{await api('/dispatch/'+b.assignment_id+'/accept','POST',{});status('Viewing accepted. You are now assigned to this journey.');await refresh();}),button('Reject viewing',async()=>{await api('/dispatch/'+b.assignment_id+'/reject','POST',{});status('Viewing offer rejected.');await refresh();}));}
      if(['admin','driver'].includes(user.role)&&b.status==='assigned')actions.append(button('Complete viewing',async()=>{await api('/bookings/'+b.id+'/complete','POST',{});status('Viewing completed.');await refresh();}));
      if(['admin','customer'].includes(user.role)&&!['completed','cancelled'].includes(b.status))actions.append(button('Cancel viewing',async()=>{await api('/bookings/'+b.id+'/cancel','POST',{});status('Viewing cancelled. Paid amounts require refund review.');await refresh();}));
      if(b.status==='requested'&&user.role==='customer')card.append(node('p','Payment is pending. Contact Ride2View operations for payment instructions; no external payment gateway is connected.'));
      card.append(actions);$('app-bookings').append(card);
    }
  }
  function renderListings(listings){$('app-listings').replaceChildren();for(const item of listings){const card=node('article',null,'app-card');card.append(node('h3',item.title),node('p',`KES ${item.price} · ${item.approved?'Approved':'Awaiting approval'} · ${item.available?'Available':'Unavailable'}`));if(user.role==='admin'&&!item.approved)card.append(button('Approve listing',async()=>{await api('/listings/'+item.id,'PATCH',{approved:true});status('Listing approved.');await refresh();}));card.append(button(item.available?'Mark unavailable':'Mark available',async()=>{await api('/listings/'+item.id,'PATCH',{available:!item.available});await refresh();}));$('app-listings').append(card);}}
  function renderUsers(){const target=$('app-users');target.replaceChildren();for(const u of users){const row=node('div',null,'app-card');row.append(node('p',`${u.name} · ${u.email} · ${u.role} · ${u.verified?'Approved':'Pending'}`));if(!u.verified&&['driver','agent'].includes(u.role))row.append(button('Approve account',async()=>{await api('/admin/users/'+u.id+'/approve','POST',{});status('Account approved.');await refresh();}));target.append(row);}}
  $('app-auth-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{user=await api('/auth/login','POST',formData(e.target));status('Signed in.');await refresh();});});
  $('app-register').addEventListener('click',()=>perform(async()=>{const data=formData($('app-auth-form'));await api('/auth/register','POST',data);user=await api('/auth/login','POST',data);status('Account created. Agent and driver accounts need administrator approval.');await refresh();}));
  $('app-logout').addEventListener('click',()=>perform(async()=>{await api('/auth/logout','POST',{});user=null;chosen=null;$('app-booking-form-section').hidden=true;roleUI();status('Signed out.');}));
  $('app-search').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{const data=formData(e.target);if(!data.budget)delete data.budget;const result=await api('/search','POST',data);renderResults(result.recommendations||[]);status(result.summary||'Search completed.');});});
  $('app-booking-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{if(!chosen)throw new Error('Choose a property first');const d=formData(e.target);await api('/bookings','POST',{listingId:chosen.id,tier:d.tier,scheduledAt:new Date(d.scheduledAt).toISOString()});status('Viewing requested. Payment verification pending.');$('app-booking-form-section').hidden=true;await refresh();});});
  $('app-listing-form').addEventListener('submit',e=>{e.preventDefault();perform(async()=>{const d=formData(e.target);await api('/listings','POST',{title:d.title,description:d.description,price:Number(d.price),location:{city:d.city},property:{bedrooms:Number(d.bedrooms)},timing:{duration:d.duration?Number(d.duration):null}});status('Listing submitted for approval.');e.target.reset();await refresh();});});
  $('app-refresh').addEventListener('click',()=>perform(refresh));$('app-preview').addEventListener('click',()=>{$('app-workspace').hidden=true;});
  function openVoice() {$('app-workspace').hidden=false;$('voice-overlay').hidden=false;$('voice-status').textContent='Speak a property search. Review it before searching.';}
  window.R2V={openVoice};$('app-voice').addEventListener('click',openVoice);
  $('app-voice-close').addEventListener('click',()=>{recognition?.stop();$('voice-overlay').hidden=true;});
  $('app-listen').addEventListener('click',()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){$('voice-status').textContent='Voice recognition is unavailable in this browser. Type your search instead.';return;}recognition?.stop();recognition=new Speech();recognition.lang='en-KE';recognition.onresult=e=>{const text=e.results[0][0].transcript;$('voice-transcript').textContent=text;$('app-search').elements.message.value=text;$('voice-status').textContent='Search captured. Close this panel and press Search.';};recognition.onerror=e=>{$('voice-status').textContent='Voice input failed: '+e.error;};recognition.start();$('voice-status').textContent='Listening…';});
  perform(async()=>{const config=await api('/config');for(const [tier,price]of Object.entries(config.tiers)){const option=node('option',`${tier} · KES ${price}`);option.value=tier;$('app-tiers').append(option);}try{user=await api('/auth/me');}catch{user=null;}await refresh();status('Ready. Search approved listings or sign in.');});
})();
