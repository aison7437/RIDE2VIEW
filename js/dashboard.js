(() => {
  'use strict';
  const R = window.R2V, {api,node,button,status} = R, workspace = document.getElementById('app-workspace');
  const root = node('section',null,'dashboard-overview'); root.id = 'account-overview'; root.hidden = true;
  workspace.insertBefore(root,document.getElementById('app-auth'));
  const nav = node('nav',null,'dashboard-sidebar'); nav.hidden = true; nav.setAttribute('aria-label','Account navigation'); workspace.prepend(nav);
  let generation = 0;
  const words = text => String(text || '').replaceAll('_',' ').toLowerCase();
  const money = amount => 'KES ' + Number(amount).toLocaleString();
  function go(id) {
    const target = document.getElementById(id);
    if (!target || target.hidden) {status('This workspace is loading. Refresh the dashboard if it remains unavailable.'); return;}
    for (let parent = target; parent && parent !== workspace; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    target.tabIndex = -1; target.focus({preventScroll:true});
  }
  function link(title,id) {const a = node('a',title); a.href = '#' + id; a.addEventListener('click',event => {event.preventDefault();go(id);}); return a;}
  function panel(title,subtitle) {const card = node('article',null,'dashboard-panel');card.append(node('h3',title));if(subtitle)card.append(node('p',subtitle,'dashboard-muted'));return card;}
  function assistant(title,workflow) {return button(title,() => {
    go('app-agents'); const select = document.querySelector('#app-agents select[name=workflow]');
    if (select && [...select.options].some(x => x.value === workflow)) {select.value=workflow;select.dispatchEvent(new Event('change'));}
  });}
  function renderNav(user) {
    nav.replaceChildren(node('strong','Ride2View','dashboard-brand'),node('p',user.role === 'driver'?'DRIVER WORKSPACE':'YOUR PROPERTY JOURNEY','dashboard-eyebrow'));
    const links = user.role === 'customer' ? [
      ['Overview','account-overview'],['Discover properties','app-discovery'],['My viewings','supply-customer'],['Viewing packages','journey-workspace'],
      ['Ride2Go','ride2go-request'],['Remote & due diligence','property-services-workspace'],['Cart & orders','shopping-panel'],
      ['Payments & tracking','operations-workspace'],['Memberships','marketplace-workspace'],['Personal assistants','app-agents'],['Profile & preferences','supply-customer']
    ] : [['Overview','account-overview'],['Viewing offers','app-bookings-section'],['Ride2Go trips','ride2go-trips'],['Viewing journeys','journey-workspace'],
      ['Earnings','marketplace-workspace'],['Documents & vehicle','mobility-driver'],['Tracking & navigation','operations-workspace'],['Driver coach','app-agents']];
    const list = node('div',null,'dashboard-nav-links');for(const [title,id] of links)list.append(link(title,id));nav.append(list,node('p',user.name,'dashboard-nav-name'),link('Account & sign out','app-account'));
  }
  async function refresh(user) {
    const token = ++generation;
    const active = () => generation === token && R.getUser()?.id === user?.id;
    const visible = !!user && ['customer','driver'].includes(user.role);
    root.hidden = !visible; nav.hidden = !visible; workspace.classList.toggle('has-dashboard',visible);
    document.querySelector('.workspace-nav').hidden = visible;
    root.replaceChildren(); if (!visible) return;
    renderNav(user);
    root.append(node('p','Loading your account overview…'));
    let data;
    try {data = await api('/dashboard');} catch (error) {
      if(active())root.replaceChildren(node('h2','Account overview'),node('p',error.message),button('Retry dashboard',() => refresh(R.getUser())));return;
    }
    if (!active()) return;
    root.replaceChildren();
    const hero = node('div',null,'dashboard-hero'), intro = node('div');
    intro.append(node('span',user.role === 'customer'?'CLIENT DASHBOARD':'DRIVER DASHBOARD','dashboard-eyebrow'),node('h2','Welcome, ' + user.name),
      node('p',user.role === 'customer'?'Find your next place. Keep every viewing and order together.':'Your offers, readiness and earnings in one place.'));
    const controls = node('div',null,'dashboard-hero-actions'); controls.append(button('Refresh dashboard',() => refresh(R.getUser())));
    if(user.role === 'driver') {
      const online = button(data.readiness.online?'Set availability: offline':'Set availability: online',async () => {
        await api('/driver/availability','PUT',{online:!data.readiness.online});
        if(active()) {status('Driver availability updated.');await R.refresh();}
      }); online.setAttribute('aria-pressed',String(data.readiness.online)); controls.append(node('span',data.readiness.online?'● Online':'○ Offline','dashboard-badge'),online);
    } else controls.append(link('Find a property','app-discovery'));
    hero.append(intro,controls);root.append(hero,node('p','Updated ' + new Date(data.updatedAt).toLocaleString() + ' · refresh for the latest status','dashboard-muted'));
    const metrics = node('div',null,'dashboard-metrics');
    const entries = user.role === 'customer' ? [
      ['Saved properties',data.metrics.savedProperties,'supply-customer'],['Active viewing packages',data.metrics.activePackages,'journey-workspace'],
      ['Viewing credits',money(data.metrics.credits),'journey-profile'],['Ride Plate checkouts',data.metrics.checkouts,'shopping-history']
    ] : [['Available offers',data.metrics.offers,'dashboard-offers'],['Completed transport trips',data.metrics.completedTrips,'app-bookings-section'],
      ['Recorded earnings',money(data.metrics.earnedKES),'marketplace-workspace'],['Active viewing packages',data.metrics.activePackages,'journey-workspace']];
    for (const [title,value,id] of entries) {const card = link('',id);card.className='dashboard-metric';card.append(node('span',title),node('strong',String(value)));metrics.append(card);}root.append(metrics);
    if(user.role === 'customer') customer(data); else driver(data,active);
    const bottom = node('div',null,'dashboard-columns');
    const packages = panel(user.role==='driver'?'Assigned viewing journeys':'Your viewing packages','Manage the whole itinerary from the viewing workspace.');
    if(!data.journeys.length)packages.append(node('p','No active viewing packages yet.'));
    for (const journey of data.journeys) {
      const card=node('div',null,'dashboard-row');card.append(node('strong',words(journey.status)+' · '+words(journey.tier)));
      if(!journey.stops.length)card.append(node('p','Draft itinerary — open the planner to review your selections.'));
      for(const stop of journey.stops)card.append(node('p',stop.title+' · '+new Date(stop.startAt).toLocaleString()+' · '+words(stop.status)));
      packages.append(card);
    }
    packages.append(link('Open viewing workspace','journey-workspace'));
    const notices=panel('Latest updates','Account notifications');
    if(!data.notifications.length)notices.append(node('p','You’re up to date. New account activity will appear here.'));
    for(const message of data.notifications)notices.append(node('p',message.message,'dashboard-row'));
    notices.append(link('All notifications','app-notifications-section'));bottom.append(packages,notices);root.append(bottom);
  }
  function customer(data) {
    const properties=panel('Explore properties',data.propertyContext), grid=node('div',null,'dashboard-grid');
    if(!data.properties.length)grid.append(node('p','No published properties match your preferences yet. Update your preferences or broaden your search.'));
    for(const property of data.properties) {
      const card=node('article',null,'dashboard-property'), photo=property.media?.find(x=>x.kind==='photo');
      if(photo && /^https:\/\//.test(photo.url)) {const img=node('img');img.src=photo.url;img.alt=photo.caption||property.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.replaceWith(node('div','Property photo unavailable','dashboard-photo-empty'));});card.append(img);}
      else card.append(node('div','Property photo not supplied','dashboard-photo-empty'));
      const info=node('div');info.append(node('span','Evidence reviewed','dashboard-badge'),node('h4',property.title),node('p',property.location.city),
        node('strong',money(property.price)+(property.transactionType==='sale'?' purchase':' / month')),node('p',(property.property?.bedrooms??'Unspecified')+' bedrooms'),
        button('Explore this property',()=>{R.showListings([property]);go('app-discovery');}));card.append(info);grid.append(card);
    }
    properties.append(grid,link('Search all listings','app-discovery'));root.append(properties);
    const columns=node('div',null,'dashboard-columns'), schedule=panel('Your next appointments','Upcoming requested and accepted viewings');
    if(!data.viewings.length)schedule.append(node('p','No upcoming appointments. Start with a property or a remote viewing.'));
    for(const viewing of data.viewings)schedule.append(node('p',viewing.title+' · '+new Date(viewing.startAt).toLocaleString()+' · '+words(viewing.status),'dashboard-row'));
    for(const ride of data.rides)schedule.append(node('p','Ride2Go: '+ride.plan.pickup+' → '+ride.plan.destination+' · '+words(ride.status),'dashboard-row'));
    schedule.append(link('Manage appointments','supply-customer'),link('Book a ride','ride2go-request'));
    const help=panel('Your personal assistants','Choose an assessment, then review its findings before acting.');
    help.append(assistant('Property advice','property-advice'),assistant('Find property opportunities','opportunities'),link('All assistants & memory settings','app-agents'),link('Remote viewing & due diligence','property-services-workspace'));
    columns.append(schedule,help);root.append(columns);
  }
  function driver(data,active) {
    const columns=node('div',null,'dashboard-columns'), offers=panel('Trip offers','Offers expire; acceptance always checks current eligibility.');offers.id='dashboard-offers';
    if(!data.offers.length)offers.append(node('p','No available offers right now. Keep your documents current and go online when ready.'));
    for(const offer of data.offers) {
      const card=node('div',null,'dashboard-row');card.append(node('h4',offer.title),node('p',words(offer.kind)+' · '+words(offer.tier)+' · '+new Date(offer.scheduledAt).toLocaleString()),node('p','Offer expires '+new Date(offer.expiresAt).toLocaleTimeString()));
      for(const accept of [true,false])card.append(button((accept?'Accept ':'Decline ')+(offer.kind==='ride2go'?'ride offer':'viewing offer'),async()=>{
        if(offer.kind==='ride2go')await api('/ride2go/assignments/'+offer.id+'/respond','POST',{decision:accept?'ACCEPTED':'REJECTED'});
        else await api('/dispatch/'+offer.id+(accept?'/accept':'/reject'),'POST',{});
        if(active()){status(accept?'Offer accepted.':'Offer declined.');await R.refresh();}
      })); offers.append(card);
    }
    const readiness=panel('Ready to drive','Eligibility comes from reviewed documents, vehicle details and expiry dates.');
    const base=data.readiness.checks.find(x=>x.kind==='driver');
    readiness.append(node('strong',base?.eligible?'Driver review current':'Driver review required','dashboard-badge'));
    const profile=data.readiness.profile;
    readiness.append(node('p',[profile.make,profile.model,profile.plate].filter(Boolean).join(' · ')||'Add your vehicle profile to get started.'));
    for(const check of data.readiness.checks)readiness.append(node('p',words(check.kind)+': '+(check.eligible?'current':words(check.status)+' / not currently eligible')+(check.expiresAt?' · expires '+new Date(check.expiresAt).toLocaleDateString():'')));
    const expiring=data.readiness.documents.filter(x=>Date.parse(x.expiresAt)<Date.now()+30*86400000);
    if(expiring.length)readiness.append(node('p',expiring.length+' document(s) expired or expiring within 30 days.','shopping-warning'));
    readiness.append(link('Manage documents & vehicle','mobility-driver'),assistant('Open driver coach','driver-coach'));columns.append(offers,readiness);root.append(columns);
    const row=node('div',null,'dashboard-columns'), earnings=panel('Earnings & settlements','Recorded earnings are not a withdrawable wallet balance. Disputed and void entries are excluded from the headline total.');
    if(!data.earnings.length)earnings.append(node('p','No earnings have been recorded yet.'));
    for(const entry of data.earnings)earnings.append(node('p',entry.currency+' '+Number(entry.amount).toLocaleString()+' · '+words(entry.status),'dashboard-row'));
    earnings.append(link('View earnings records','marketplace-workspace'));
    const rides=panel('Current Ride2Go trips','Open the trip workspace for arrival, pickup and completion.');
    if(!data.rides.length)rides.append(node('p','No active Ride2Go trips.'));
    for(const trip of data.rides)rides.append(node('p',trip.plan.pickup+' → '+trip.plan.destination+' · '+words(trip.status),'dashboard-row'));
    rides.append(link('Manage trip progress','ride2go-trips'));row.append(earnings,rides);root.append(row);
  }
  window.R2VDashboard={refresh};
})();
