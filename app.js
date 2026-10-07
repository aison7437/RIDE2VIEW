// Global app state
const app = {
  theme: localStorage.getItem('theme') || 'green',
  role: localStorage.getItem('role') || 'rider',
  user: { name: 'Alex Johnson', email: 'alex@ride2view.com', verified: true },
  currentScreen: 'home',
  rideStep: 1,
  cart: [],
  trips: [
    { id: 1, type: 'RIDE2GO', status: 'Completed', date: 'Today', icon: '🚗', from: 'Work', to: 'Home', price: 12.50, tier: 'Silver' },
    { id: 2, type: 'RIDE2GO', status: 'Completed', date: 'Yesterday', icon: '🚗', from: 'Mall', to: 'Gym', price: 8.75, tier: 'Gold' },
  ],
  data: {
    properties: [
      { id: 1, name: 'Sunset Apartment', location: 'Downtown', price: 250, period: 'mo', stars: 4.8, reviews: 128, img: '🏢' },
      { id: 2, name: 'Beach House', location: 'Coastal', price: 450, period: 'mo', stars: 4.9, reviews: 256, img: '🏠' },
      { id: 3, name: 'Modern Studio', location: 'Midtown', price: 180, period: 'mo', stars: 4.6, reviews: 89, img: '🏢' },
      { id: 4, name: 'Luxury Penthouse', location: 'Downtown', price: 1200, period: 'mo', stars: 5.0, reviews: 45, img: '🏰' },
    ],
    stores: [
      { id: 1, name: 'Fresh Mart', location: '0.5 km', logo: '🛒', badge: 'Open', rating: 4.7 },
      { id: 2, name: 'Quick Stores', location: '1.2 km', logo: '🏪', badge: '24h', rating: 4.5 },
    ],
    inventory: [
      { id: 1, name: 'Milk', category: 'Dairy', priority: 'high', icon: '🥛' },
      { id: 2, name: 'Bread', category: 'Bakery', priority: 'med', icon: '🍞' },
      { id: 3, name: 'Apples', category: 'Produce', priority: 'low', icon: '🍎' },
    ],
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTheme(app.theme);
  setRole(app.role);
  renderScreens();
  attachEventListeners();
});

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  app.theme = theme;
  localStorage.setItem('theme', theme);
}

function setRole(role) {
  app.role = role;
  localStorage.setItem('role', role);
  renderScreens();
}

function showScreen(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${screenName}`);
  if (screen) screen.classList.add('active');
  app.currentScreen = screenName;
}

function showRideStep(step) {
  document.querySelectorAll('.rstep-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`rstep-${step}`)?.classList.add('active');
  updateRideProgress(step);
  app.rideStep = step;
}

function updateRideProgress(step) {
  document.querySelectorAll('.rstep-seg').forEach((seg, i) => {
    seg.classList.remove('done', 'active');
    if (i + 1 < step) seg.classList.add('done');
    if (i + 1 === step) seg.classList.add('active');
  });
}

function renderScreens() {
  const roleContent = { rider: 'Rider', driver: 'Driver', merchant: 'Merchant', host: 'Host' };
  const roleDiv = document.getElementById('role-indicator');
  if (roleDiv) roleDiv.textContent = roleContent[app.role] || '';
}

function attachEventListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const screenName = item.dataset.screen || item.textContent.toLowerCase();
      showScreen(screenName);
    });
  });

  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themBtn));
  });

  document.querySelectorAll('[data-ride-step]').forEach(btn => {
    btn.addEventListener('click', () => showRideStep(parseInt(btn.dataset.rideStep)));
  });

  document.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', () => setRole(btn.dataset.role));
  });

  document.querySelectorAll('.rstep-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = app.rideStep + 1;
      if (nextStep <= 8) showRideStep(nextStep);
    });
  });

  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = app.rideStep - 1;
      if (prevStep >= 1) showRideStep(prevStep);
    });
  });

  document.querySelectorAll('.inv-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      app.cart.push({ id: Date.now(), name: 'Item' });
      alert('Added to cart!');
    });
  });
}

function populateProperties() {
  const grid = document.querySelector('.prop-grid2, .sug-grid');
  if (!grid) return;
  grid.innerHTML = app.data.properties.map(p => `<div class="pcard" onclick="alert('Property: ${p.name}')"><div class="pimg">${p.img}</div><div class="pbody"><div class="pprice">$${p.price}<span class="pperiod">/${p.period}</span></div><div class="pname">${p.name}</div><div class="ploc">${p.location}</div><div class="prating"><span class="pstars">⭐ ${p.stars}</span><span class="prnum">${p.reviews}</span></div></div></div>`).join('');
}

function populateTrips() {
  const body = document.querySelector('.trips-body');
  if (!body) return;
  body.innerHTML = app.trips.map(t => `<div class="trip-card"><div class="trip-hdr"><span class="trip-status">${t.status}</span><span class="trip-date">${t.date}</span></div><div class="trip-body2"><div class="trip-thumb">${t.icon}</div><div><div class="tname">${t.from} → ${t.to}</div><div class="tloc">${t.type}</div><div class="tpr-row"><span class="tier-badge tbg">⭐ ${t.tier}</span><span class="tprice">$${t.price}</span></div></div></div></div>`).join('');
}

function populateShop() {
  const grid = document.querySelector('.sm-grid');
  if (!grid) return;
  grid.innerHTML = app.data.stores.map(s => `<div class="sm-card" onclick="alert('Store: ${s.name}')"><div class="sm-logo-area">${s.logo}</div><div class="sm-badge sm-open">${s.badge}</div><div class="sm-info"><div class="sm-name">${s.name}</div><div class="sm-loc">${s.location}</div><div class="sm-row"><span class="sm-rating">⭐ ${s.rating}</span></div></div></div>`).join('');
}

function populateInventory() {
  const section = document.querySelector('.inv-grid');
  if (!section) return;
  section.innerHTML = app.data.inventory.map(i => `<div class="inv-item"><div class="inv-item-icon">${i.icon}</div><div><div class="inv-item-name">${i.name}</div><div class="inv-item-cat">${i.category}</div></div><span class="inv-item-pri pri-${i.priority}">${i.priority.toUpperCase()}</span><button class="inv-add-btn">+</button></div>`).join('');
}

window.addEventListener('load', () => {
  populateProperties();
  populateTrips();
  populateShop();
  populateInventory();
  showScreen('home');
});

window.app = app;
window.setTheme = setTheme;
window.setRole = setRole;
window.showScreen = showScreen;
window.showRideStep = showRideStep;