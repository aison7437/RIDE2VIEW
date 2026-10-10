

/* ════════════════════════════════════════════════════
   PART A — UI SYSTEM SPEC (runtime)
════════════════════════════════════════════════════ */

/* ── THEME CONFIG JSON ── */
const THEME_CONFIG = {
  themes: {
    white:  { label:"White",  wcag:"AA 4.6:1", brand:"#1A1A2E", light:"#4A4AFF",  bg:"#FFFFFF", dark:false },
    black:  { label:"Black",  wcag:"AAA 7:1",  brand:"#000000", light:"#32D74B",  bg:"#000000", dark:true  },
    gold:   { label:"Gold",   wcag:"AA 4.8:1", brand:"#7A5000", light:"#D4A017",  bg:"#FDFAF0", dark:false },
    green:  { label:"Green",  wcag:"AA 5.2:1", brand:"#1A4A2E", light:"#3DAF66",  bg:"#F3F6F3", dark:false },
    pink:   { label:"Pink",   wcag:"AA 4.9:1", brand:"#A0004A", light:"#FF2D78",  bg:"#FFF5F8", dark:false },
    blue:   { label:"Blue",   wcag:"AA 5.1:1", brand:"#0040A0", light:"#007AFF",  bg:"#F0F4FF", dark:false },
  },
  default: "green",
  storage: "localStorage",
  transitions: "300ms ease-in-out"
};

let currentTheme = localStorage.getItem('r2v-theme') || 'green';

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  currentTheme = name;
  localStorage.setItem('r2v-theme', name);
  // Update swatches
  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('selected'));
  const sw = document.getElementById('swatch-' + name);
  if (sw) sw.classList.add('selected');
  // Update JSON display
  const cfg = THEME_CONFIG.themes[name];
  document.getElementById('theme-json-display').textContent =
    `{ "theme": "${name}",\n  "wcag": "${cfg.wcag}",\n  "brand": "${cfg.brand}",\n  "accent": "${cfg.light}",\n  "bg": "${cfg.bg}",\n  "darkMode": ${cfg.dark} }`;
  toast('🎨 Theme changed to ' + cfg.label);
}

// Apply saved theme on load
applyTheme(currentTheme);

/* ════════════════════════════════════════════════════
   PART B — INVENTORY DATA (242+ items, 11 sections)
════════════════════════════════════════════════════ */
const INVENTORY = [
  // FRESH PRODUCE
  {s:"Fresh Produce",  n:"Sukuma Wiki (Kale) 500g",        c:"Leafy Greens",  p:"high",   i:"🥬"},
  {s:"Fresh Produce",  n:"Tomatoes 1kg",                   c:"Vegetables",    p:"high",   i:"🍅"},
  {s:"Fresh Produce",  n:"Onions (Red) 1kg",               c:"Vegetables",    p:"high",   i:"🧅"},
  {s:"Fresh Produce",  n:"Carrots 500g",                   c:"Root Veg",      p:"high",   i:"🥕"},
  {s:"Fresh Produce",  n:"Green Capsicum x3",              c:"Vegetables",    p:"medium", i:"🫑"},
  {s:"Fresh Produce",  n:"Spinach (Mchicha) 250g",         c:"Leafy Greens",  p:"medium", i:"🥬"},
  {s:"Fresh Produce",  n:"Cabbage (whole)",                c:"Brassicas",     p:"high",   i:"🥦"},
  {s:"Fresh Produce",  n:"Banana (bunch)",                 c:"Fruit",         p:"high",   i:"🍌"},
  {s:"Fresh Produce",  n:"Avocado x2",                     c:"Fruit",         p:"high",   i:"🥑"},
  {s:"Fresh Produce",  n:"Pineapple (whole)",              c:"Tropical Fruit",p:"medium", i:"🍍"},
  {s:"Fresh Produce",  n:"Watermelon (half)",              c:"Fruit",         p:"medium", i:"🍉"},
  {s:"Fresh Produce",  n:"Mango x3",                       c:"Tropical Fruit",p:"medium", i:"🥭"},
  {s:"Fresh Produce",  n:"Passion Fruits 6pk",             c:"Tropical Fruit",p:"medium", i:"🟣"},
  {s:"Fresh Produce",  n:"Sweet Potato 1kg",               c:"Root Veg",      p:"high",   i:"🍠"},
  {s:"Fresh Produce",  n:"Irish Potatoes 2kg",             c:"Root Veg",      p:"high",   i:"🥔"},
  {s:"Fresh Produce",  n:"Garlic (bulb x3)",               c:"Aromatics",     p:"high",   i:"🧄"},
  {s:"Fresh Produce",  n:"Fresh Ginger 200g",              c:"Aromatics",     p:"medium", i:"🫚"},
  {s:"Fresh Produce",  n:"Dhania (Coriander) bunch",       c:"Herbs",         p:"medium", i:"🌿"},
  {s:"Fresh Produce",  n:"Lemon x4",                       c:"Citrus",        p:"medium", i:"🍋"},
  {s:"Fresh Produce",  n:"Cucumber x2",                    c:"Vegetables",    p:"medium", i:"🥒"},
  {s:"Fresh Produce",  n:"Baby Spinach 200g",              c:"Leafy Greens",  p:"low",    i:"🥗"},
  {s:"Fresh Produce",  n:"Spring Onions bunch",            c:"Aromatics",     p:"medium", i:"🌱"},
  // MEAT & SEAFOOD
  {s:"Meat & Seafood", n:"Chicken Breast Fillet 1kg",      c:"Poultry",       p:"high",   i:"🍗"},
  {s:"Meat & Seafood", n:"Whole Chicken 1.2kg",            c:"Poultry",       p:"high",   i:"🐔"},
  {s:"Meat & Seafood", n:"Chicken Wings 500g",             c:"Poultry",       p:"medium", i:"🍗"},
  {s:"Meat & Seafood", n:"Chicken Drumsticks 500g",        c:"Poultry",       p:"medium", i:"🍗"},
  {s:"Meat & Seafood", n:"Beef Mince 500g",                c:"Beef",          p:"high",   i:"🥩"},
  {s:"Meat & Seafood", n:"Beef Stewing (cubes) 500g",      c:"Beef",          p:"high",   i:"🥩"},
  {s:"Meat & Seafood", n:"Beef Ribs 500g",                 c:"Beef",          p:"medium", i:"🍖"},
  {s:"Meat & Seafood", n:"Pork Chops 400g",                c:"Pork",          p:"low",    i:"🥩"},
  {s:"Meat & Seafood", n:"Beef Sausages 500g",             c:"Processed",     p:"high",   i:"🌭"},
  {s:"Meat & Seafood", n:"Tilapia (whole) 600g",           c:"Fish",          p:"high",   i:"🐟"},
  {s:"Meat & Seafood", n:"Omena (Dagaa) 200g",             c:"Fish",          p:"high",   i:"🐠"},
  {s:"Meat & Seafood", n:"Tuna in Brine (can) 185g",       c:"Canned Fish",   p:"medium", i:"🐟"},
  {s:"Meat & Seafood", n:"Prawns (peeled) 300g",           c:"Seafood",       p:"low",    i:"🍤"},
  {s:"Meat & Seafood", n:"Goat Meat 500g",                 c:"Goat/Mutton",   p:"medium", i:"🐐"},
  {s:"Meat & Seafood", n:"Lamb Chops 400g",                c:"Lamb",          p:"low",    i:"🥩"},
  {s:"Meat & Seafood", n:"Bacon Rashers 200g",             c:"Processed",     p:"medium", i:"🥓"},
  {s:"Meat & Seafood", n:"Chicken Hot Dogs 400g",          c:"Processed",     p:"medium", i:"🌭"},
  {s:"Meat & Seafood", n:"Salami 150g",                    c:"Processed",     p:"low",    i:"🍖"},
  {s:"Meat & Seafood", n:"Corned Beef (can) 340g",         c:"Canned Meat",   p:"medium", i:"🥫"},
  {s:"Meat & Seafood", n:"Smoked Sausage 300g",            c:"Processed",     p:"medium", i:"🌭"},
  // DAIRY
  {s:"Dairy",          n:"KCC Fresh Milk 1L",              c:"Milk",          p:"high",   i:"🥛"},
  {s:"Dairy",          n:"Brookside Full Cream Milk 500ml",c:"Milk",          p:"high",   i:"🥛"},
  {s:"Dairy",          n:"Long-Life Milk 1L",              c:"Milk",          p:"high",   i:"🥛"},
  {s:"Dairy",          n:"Yoplait Plain Yoghurt 500g",     c:"Yoghurt",       p:"high",   i:"🫙"},
  {s:"Dairy",          n:"Strawberry Drinking Yoghurt 200ml",c:"Yoghurt",     p:"medium", i:"🍓"},
  {s:"Dairy",          n:"Anchor Butter 250g",             c:"Butter",        p:"high",   i:"🧈"},
  {s:"Dairy",          n:"Blue Band Margarine 250g",       c:"Margarine",     p:"high",   i:"🧈"},
  {s:"Dairy",          n:"Cheddar Cheese Slices 200g",     c:"Cheese",        p:"medium", i:"🧀"},
  {s:"Dairy",          n:"Mozzarella Cheese 200g",         c:"Cheese",        p:"low",    i:"🧀"},
  {s:"Dairy",          n:"Cream Cheese 150g",              c:"Cheese",        p:"low",    i:"🧀"},
  {s:"Dairy",          n:"Kenchic Eggs (tray 12)",         c:"Eggs",          p:"high",   i:"🥚"},
  {s:"Dairy",          n:"Kenchic Eggs (6pk)",             c:"Eggs",          p:"high",   i:"🥚"},
  {s:"Dairy",          n:"Fresh Cream 250ml",              c:"Cream",         p:"medium", i:"🥛"},
  {s:"Dairy",          n:"Sour Cream 200ml",               c:"Cream",         p:"low",    i:"🥛"},
  {s:"Dairy",          n:"Condensed Milk 397g",            c:"Milk Products", p:"medium", i:"🥫"},
  {s:"Dairy",          n:"Evaporated Milk 410ml",          c:"Milk Products", p:"medium", i:"🥫"},
  {s:"Dairy",          n:"Lala Flavoured Milk 250ml",      c:"Milk",          p:"medium", i:"🥛"},
  {s:"Dairy",          n:"Zena Ghee 500ml",                c:"Ghee",          p:"high",   i:"🫙"},
  {s:"Dairy",          n:"Drinking Yoghurt 250ml",         c:"Yoghurt",       p:"medium", i:"🥛"},
  {s:"Dairy",          n:"Goat Milk UHT 1L",              c:"Milk",          p:"low",    i:"🐐"},
  {s:"Dairy",          n:"Parmesan Cheese 100g",          c:"Cheese",        p:"low",    i:"🧀"},
  // FROZEN FOODS
  {s:"Frozen Foods",   n:"Frozen Chips (McCain) 750g",     c:"Frozen Veg",    p:"high",   i:"🍟"},
  {s:"Frozen Foods",   n:"Frozen Green Peas 500g",         c:"Frozen Veg",    p:"medium", i:"🫛"},
  {s:"Frozen Foods",   n:"Vanilla Ice Cream 1L",           c:"Ice Cream",     p:"medium", i:"🍦"},
  {s:"Frozen Foods",   n:"Chocolate Ice Cream 1L",         c:"Ice Cream",     p:"medium", i:"🍫"},
  {s:"Frozen Foods",   n:"Frozen Fish Fingers 400g",       c:"Frozen Fish",   p:"medium", i:"🐟"},
  {s:"Frozen Foods",   n:"Chicken Nuggets 500g",           c:"Frozen Chicken",p:"high",   i:"🍗"},
  {s:"Frozen Foods",   n:"Frozen Margherita Pizza 400g",   c:"Frozen Meals",  p:"low",    i:"🍕"},
  {s:"Frozen Foods",   n:"Frozen Samosas 12pk",            c:"Frozen Snacks", p:"medium", i:"🥟"},
  {s:"Frozen Foods",   n:"Frozen Spring Rolls 400g",       c:"Frozen Snacks", p:"low",    i:"🥢"},
  {s:"Frozen Foods",   n:"Ice Lollies 4pk",                c:"Ice Cream",     p:"low",    i:"🍦"},
  {s:"Frozen Foods",   n:"Frozen Mixed Vegetables 500g",   c:"Frozen Veg",    p:"medium", i:"🥗"},
  {s:"Frozen Foods",   n:"Frozen Prawns 300g",             c:"Frozen Seafood",p:"low",    i:"🍤"},
  {s:"Frozen Foods",   n:"Frozen Sweet Corn 400g",         c:"Frozen Veg",    p:"medium", i:"🌽"},
  {s:"Frozen Foods",   n:"Frozen Edamame 400g",            c:"Frozen Veg",    p:"low",    i:"🫘"},
  {s:"Frozen Foods",   n:"Frozen Cassava Chips 500g",      c:"Frozen Snacks", p:"medium", i:"🍟"},
  {s:"Frozen Foods",   n:"Frozen Vegetable Biryani 400g",  c:"Frozen Meals",  p:"low",    i:"🍛"},
  {s:"Frozen Foods",   n:"Strawberry Ice Cream 500ml",     c:"Ice Cream",     p:"medium", i:"🍓"},
  {s:"Frozen Foods",   n:"Frozen Bread Rolls 6pk",         c:"Frozen Bakery", p:"medium", i:"🍞"},
  {s:"Frozen Foods",   n:"Frozen Spinach Cubes 400g",      c:"Frozen Veg",    p:"medium", i:"🥬"},
  {s:"Frozen Foods",   n:"Frozen Beef Patties 4pk",        c:"Frozen Meat",   p:"medium", i:"🍔"},
  // DRY GOODS
  {s:"Dry Goods",      n:"Jogoo Unga wa Ugali 2kg",        c:"Maize Flour",   p:"high",   i:"🌽"},
  {s:"Dry Goods",      n:"Basmati Rice 2kg",               c:"Rice",          p:"high",   i:"🍚"},
  {s:"Dry Goods",      n:"Spaghetti 500g",                 c:"Pasta",         p:"high",   i:"🍝"},
  {s:"Dry Goods",      n:"Weetabix 430g",                  c:"Cereals",       p:"medium", i:"🌾"},
  {s:"Dry Goods",      n:"Corn Flakes 500g",               c:"Cereals",       p:"medium", i:"🌽"},
  {s:"Dry Goods",      n:"Quaker Oats 500g",               c:"Cereals",       p:"high",   i:"🥣"},
  {s:"Dry Goods",      n:"Pembe Wheat Flour 2kg",          c:"Wheat Flour",   p:"high",   i:"🌾"},
  {s:"Dry Goods",      n:"Sugar (white) 2kg",              c:"Sugar",         p:"high",   i:"🍬"},
  {s:"Dry Goods",      n:"Table Salt 500g",                c:"Condiments",    p:"high",   i:"🧂"},
  {s:"Dry Goods",      n:"Cooking Oil (Elianto) 2L",       c:"Cooking Oil",   p:"high",   i:"🫙"},
  {s:"Dry Goods",      n:"Red Lentils 500g",               c:"Pulses",        p:"medium", i:"🫘"},
  {s:"Dry Goods",      n:"Kidney Beans 500g",              c:"Pulses",        p:"medium", i:"🫘"},
  {s:"Dry Goods",      n:"Chickpeas 500g",                 c:"Pulses",        p:"medium", i:"🫘"},
  {s:"Dry Goods",      n:"Black-Eyed Peas 500g",           c:"Pulses",        p:"medium", i:"🫘"},
  {s:"Dry Goods",      n:"Semolina 500g",                  c:"Flour",         p:"low",    i:"🌾"},
  {s:"Dry Goods",      n:"Brown Rice 2kg",                 c:"Rice",          p:"medium", i:"🍚"},
  {s:"Dry Goods",      n:"Penne Pasta 500g",               c:"Pasta",         p:"medium", i:"🍝"},
  {s:"Dry Goods",      n:"Baking Flour 1kg",               c:"Baking",        p:"medium", i:"🧁"},
  {s:"Dry Goods",      n:"Baking Powder 100g",             c:"Baking",        p:"medium", i:"🧪"},
  {s:"Dry Goods",      n:"Maandazi Mix 400g",              c:"Baking",        p:"medium", i:"🍩"},
  // BAKERY
  {s:"Bakery",         n:"Supa Loaf Sliced White Bread",   c:"Bread",         p:"high",   i:"🍞"},
  {s:"Bakery",         n:"Brown Bread (sliced)",           c:"Bread",         p:"high",   i:"🍞"},
  {s:"Bakery",         n:"Whole Wheat Bread",              c:"Bread",         p:"medium", i:"🍞"},
  {s:"Bakery",         n:"Dinner Rolls 6pk",               c:"Rolls",         p:"medium", i:"🥖"},
  {s:"Bakery",         n:"Croissants 4pk",                 c:"Pastries",      p:"medium", i:"🥐"},
  {s:"Bakery",         n:"Doughnuts 4pk",                  c:"Pastries",      p:"medium", i:"🍩"},
  {s:"Bakery",         n:"Muffins 2pk",                    c:"Pastries",      p:"low",    i:"🧁"},
  {s:"Bakery",         n:"Scones 4pk",                     c:"Pastries",      p:"medium", i:"🫓"},
  {s:"Bakery",         n:"Baguette (French loaf)",         c:"Bread",         p:"low",    i:"🥖"},
  {s:"Bakery",         n:"Raisin Bread 400g",              c:"Bread",         p:"low",    i:"🍞"},
  {s:"Bakery",         n:"Chapati 4pk",                    c:"Flatbread",     p:"high",   i:"🫓"},
  {s:"Bakery",         n:"Mandazi 6pk",                    c:"Pastries",      p:"high",   i:"🍩"},
  {s:"Bakery",         n:"Cake Slice (assorted)",          c:"Cakes",         p:"low",    i:"🎂"},
  {s:"Bakery",         n:"Garlic Bread loaf",              c:"Bread",         p:"medium", i:"🥖"},
  {s:"Bakery",         n:"Pita Bread 6pk",                 c:"Flatbread",     p:"low",    i:"🫓"},
  {s:"Bakery",         n:"Bagels 4pk",                     c:"Bread",         p:"low",    i:"🥯"},
  {s:"Bakery",         n:"Banana Bread loaf",              c:"Cakes",         p:"low",    i:"🍌"},
  {s:"Bakery",         n:"Sourdough Loaf",                 c:"Bread",         p:"low",    i:"🍞"},
  {s:"Bakery",         n:"Cinnamon Rolls 4pk",             c:"Pastries",      p:"low",    i:"🌀"},
  {s:"Bakery",         n:"Hot Cross Buns 6pk",             c:"Pastries",      p:"low",    i:"🥐"},
  // BEVERAGES
  {s:"Beverages",      n:"Coca-Cola 500ml",                c:"Carbonated",    p:"high",   i:"🥤"},
  {s:"Beverages",      n:"Coca-Cola 2L",                   c:"Carbonated",    p:"high",   i:"🥤"},
  {s:"Beverages",      n:"Fanta Orange 500ml",             c:"Carbonated",    p:"medium", i:"🧡"},
  {s:"Beverages",      n:"Sprite 500ml",                   c:"Carbonated",    p:"medium", i:"🥤"},
  {s:"Beverages",      n:"Stoney Tangawizi 500ml",         c:"Carbonated",    p:"medium", i:"🫚"},
  {s:"Beverages",      n:"Minute Maid Orange 1L",          c:"Juice",         p:"medium", i:"🍊"},
  {s:"Beverages",      n:"Delmonte Juice 1L",              c:"Juice",         p:"medium", i:"🍹"},
  {s:"Beverages",      n:"Volvic Water 500ml",             c:"Water",         p:"high",   i:"💧"},
  {s:"Beverages",      n:"Keringet Water 1.5L",            c:"Water",         p:"high",   i:"💧"},
  {s:"Beverages",      n:"Nescafé Classic 200g",           c:"Coffee",        p:"high",   i:"☕"},
  {s:"Beverages",      n:"Ketepa Pride Tea 100 bags",      c:"Tea",           p:"high",   i:"🫖"},
  {s:"Beverages",      n:"Milo 400g",                      c:"Malt Drinks",   p:"high",   i:"🍫"},
  {s:"Beverages",      n:"Ribena Blackcurrant 500ml",      c:"Juice",         p:"medium", i:"🍇"},
  {s:"Beverages",      n:"Red Bull 250ml",                 c:"Energy Drinks", p:"medium", i:"⚡"},
  {s:"Beverages",      n:"Tusker Lager 500ml",             c:"Alcohol",       p:"medium", i:"🍺"},
  {s:"Beverages",      n:"Guinness 500ml",                 c:"Alcohol",       p:"medium", i:"🍺"},
  {s:"Beverages",      n:"Novida Passion 500ml",           c:"Carbonated",    p:"medium", i:"🟡"},
  {s:"Beverages",      n:"Quencher 500ml",                 c:"Energy Drinks", p:"medium", i:"🥤"},
  {s:"Beverages",      n:"Hot Chocolate 250g",             c:"Hot Drinks",    p:"low",    i:"🍫"},
  {s:"Beverages",      n:"Amarula Cream 750ml",            c:"Alcohol",       p:"low",    i:"🍾"},
  // HOUSEHOLD & CLEANING
  {s:"Household",      n:"Omo Detergent 1kg",              c:"Laundry",       p:"high",   i:"🧺"},
  {s:"Household",      n:"Ariel Washing Powder 500g",      c:"Laundry",       p:"high",   i:"🧺"},
  {s:"Household",      n:"Jik Bleach 750ml",               c:"Cleaning",      p:"high",   i:"🫧"},
  {s:"Household",      n:"Harpic Toilet Cleaner 500ml",    c:"Bathroom",      p:"high",   i:"🚽"},
  {s:"Household",      n:"Vim Scouring Powder 500g",       c:"Cleaning",      p:"medium", i:"✨"},
  {s:"Household",      n:"Fairy Dish Soap 500ml",          c:"Kitchen",       p:"high",   i:"🍽️"},
  {s:"Household",      n:"Dettol Surface Spray 500ml",     c:"Disinfectant",  p:"high",   i:"🧴"},
  {s:"Household",      n:"Domestos Toilet Cleaner 750ml",  c:"Bathroom",      p:"medium", i:"🚽"},
  {s:"Household",      n:"Toilet Paper 9 rolls",           c:"Bathroom",      p:"high",   i:"🧻"},
  {s:"Household",      n:"Kitchen Towels 2pk",             c:"Kitchen",       p:"medium", i:"🍃"},
  {s:"Household",      n:"Garbage Bags 20pk",              c:"Waste",         p:"high",   i:"🗑️"},
  {s:"Household",      n:"Zip Firelighters 10pk",          c:"Kitchen",       p:"medium", i:"🔥"},
  {s:"Household",      n:"Doom Insecticide 300ml",         c:"Pest Control",  p:"medium", i:"🦟"},
  {s:"Household",      n:"Mortein Mosquito Coils 10pk",    c:"Pest Control",  p:"high",   i:"🌀"},
  {s:"Household",      n:"Pledge Furniture Polish 300ml",  c:"Cleaning",      p:"low",    i:"✨"},
  {s:"Household",      n:"Mop Head (replacement)",         c:"Cleaning",      p:"low",    i:"🧹"},
  {s:"Household",      n:"Broom + Dustpan set",            c:"Cleaning",      p:"medium", i:"🧹"},
  {s:"Household",      n:"Dishwashing Sponges 3pk",        c:"Kitchen",       p:"high",   i:"🧽"},
  {s:"Household",      n:"Rubber Gloves (pair)",           c:"Cleaning",      p:"medium", i:"🧤"},
  {s:"Household",      n:"Air Freshener Glade 300ml",      c:"Air Care",      p:"medium", i:"🌸"},
  // PERSONAL CARE
  {s:"Personal Care",  n:"Dove Soap Bar 3pk",              c:"Soap",          p:"high",   i:"🧼"},
  {s:"Personal Care",  n:"Lux Soap Bar 3pk",               c:"Soap",          p:"high",   i:"🧼"},
  {s:"Personal Care",  n:"Vaseline Lotion 400ml",          c:"Body Care",     p:"high",   i:"🧴"},
  {s:"Personal Care",  n:"Nivea Cream 200ml",              c:"Body Care",     p:"high",   i:"🧴"},
  {s:"Personal Care",  n:"Head & Shoulders Shampoo 400ml", c:"Hair Care",     p:"high",   i:"🚿"},
  {s:"Personal Care",  n:"Pantene Conditioner 400ml",      c:"Hair Care",     p:"medium", i:"🚿"},
  {s:"Personal Care",  n:"Colgate Toothpaste 150g",        c:"Oral Care",     p:"high",   i:"🦷"},
  {s:"Personal Care",  n:"Oral-B Toothbrush 2pk",          c:"Oral Care",     p:"high",   i:"🪥"},
  {s:"Personal Care",  n:"Gillette Razor 2pk",             c:"Shaving",       p:"medium", i:"🪒"},
  {s:"Personal Care",  n:"Always Ultra Pads 10pk",         c:"Feminine Care", p:"high",   i:"🌸"},
  {s:"Personal Care",  n:"Dettol Antiseptic 500ml",        c:"First Aid",     p:"high",   i:"🩹"},
  {s:"Personal Care",  n:"Panadol Tablets 24pk",           c:"Pharmacy",      p:"high",   i:"💊"},
  {s:"Personal Care",  n:"Strepsils Throat Lozenges 24pk", c:"Pharmacy",      p:"medium", i:"💊"},
  {s:"Personal Care",  n:"Sunscreen SPF50 150ml",          c:"Skin Care",     p:"medium", i:"☀️"},
  {s:"Personal Care",  n:"Rexona Deodorant 150ml",         c:"Deodorant",     p:"high",   i:"💨"},
  {s:"Personal Care",  n:"Cotton Buds 100pk",              c:"Personal Care", p:"medium", i:"🏥"},
  {s:"Personal Care",  n:"Nail Clippers",                  c:"Personal Care", p:"low",    i:"✂️"},
  {s:"Personal Care",  n:"Chapstick Lip Balm",             c:"Personal Care", p:"low",    i:"💋"},
  {s:"Personal Care",  n:"Johnson's Baby Powder 200g",     c:"Personal Care", p:"medium", i:"🌸"},
  {s:"Personal Care",  n:"Feminine Wipes 20pk",            c:"Feminine Care", p:"medium", i:"🌸"},
  // BABY PRODUCTS
  {s:"Baby Products",  n:"Pampers Diapers Size 3 40pk",    c:"Diapers",       p:"high",   i:"👶"},
  {s:"Baby Products",  n:"Huggies Diapers Size 4 36pk",    c:"Diapers",       p:"high",   i:"👶"},
  {s:"Baby Products",  n:"Johnson's Baby Lotion 300ml",    c:"Baby Skin",     p:"high",   i:"🧴"},
  {s:"Baby Products",  n:"Johnson's Baby Shampoo 300ml",   c:"Baby Hair",     p:"high",   i:"🚿"},
  {s:"Baby Products",  n:"Cerelac Wheat 400g",             c:"Baby Food",     p:"high",   i:"🥣"},
  {s:"Baby Products",  n:"Nestum Rice Cereal 400g",        c:"Baby Food",     p:"high",   i:"🥣"},
  {s:"Baby Products",  n:"Nan 1 Formula 400g",             c:"Baby Formula",  p:"high",   i:"🍼"},
  {s:"Baby Products",  n:"Aptamil 2 Formula 400g",         c:"Baby Formula",  p:"high",   i:"🍼"},
  {s:"Baby Products",  n:"Baby Wipes 80pk",                c:"Baby Hygiene",  p:"high",   i:"🧻"},
  {s:"Baby Products",  n:"Baby Food Puree (Heinz) 120g",   c:"Baby Food",     p:"medium", i:"🥄"},
  {s:"Baby Products",  n:"Teething Gel 20g",               c:"Baby Health",   p:"medium", i:"💊"},
  {s:"Baby Products",  n:"Baby Oil 200ml",                 c:"Baby Skin",     p:"medium", i:"🫙"},
  {s:"Baby Products",  n:"Gripe Water 150ml",              c:"Baby Health",   p:"medium", i:"💧"},
  {s:"Baby Products",  n:"Baby Rash Cream 100g",           c:"Baby Skin",     p:"medium", i:"🧴"},
  {s:"Baby Products",  n:"Nursing Pads 24pk",              c:"Maternity",     p:"medium", i:"🌸"},
  {s:"Baby Products",  n:"Baby Bottles 2pk",               c:"Feeding",       p:"medium", i:"🍼"},
  {s:"Baby Products",  n:"Sippy Cup",                      c:"Feeding",       p:"low",    i:"🥤"},
  {s:"Baby Products",  n:"Baby Spoons 4pk",                c:"Feeding",       p:"low",    i:"🥄"},
  {s:"Baby Products",  n:"Baby Thermometer",               c:"Baby Health",   p:"medium", i:"🌡️"},
  {s:"Baby Products",  n:"Baby Monitor",                   c:"Baby Safety",   p:"low",    i:"📡"},
  // SNACKS & CONFECTIONERY
  {s:"Snacks",         n:"Pringles Original 165g",         c:"Crisps",        p:"medium", i:"🫙"},
  {s:"Snacks",         n:"Lay's Classic Crisps 100g",      c:"Crisps",        p:"medium", i:"🥔"},
  {s:"Snacks",         n:"Simba Crinkle Cut 125g",         c:"Crisps",        p:"medium", i:"🌽"},
  {s:"Snacks",         n:"Cadbury Dairy Milk 200g",        c:"Chocolate",     p:"medium", i:"🍫"},
  {s:"Snacks",         n:"Kit Kat 4-Finger",               c:"Chocolate",     p:"medium", i:"🍫"},
  {s:"Snacks",         n:"Snickers 50g",                   c:"Chocolate",     p:"medium", i:"🍫"},
  {s:"Snacks",         n:"Orbit Chewing Gum",              c:"Gum",           p:"low",    i:"🫧"},
  {s:"Snacks",         n:"Mentos Roll (assorted)",         c:"Candy",         p:"low",    i:"⭕"},
  {s:"Snacks",         n:"Haribo Gummies 100g",            c:"Candy",         p:"low",    i:"🐻"},
  {s:"Snacks",         n:"Digestive Biscuits 400g",        c:"Biscuits",      p:"medium", i:"🍪"},
  {s:"Snacks",         n:"Oreo Cookies 154g",              c:"Biscuits",      p:"medium", i:"🍪"},
  {s:"Snacks",         n:"Ritz Crackers 200g",             c:"Crackers",      p:"medium", i:"🧇"},
  {s:"Snacks",         n:"Microwave Popcorn 3pk",          c:"Snacks",        p:"medium", i:"🍿"},
  {s:"Snacks",         n:"Roasted Peanuts 200g",           c:"Nuts",          p:"medium", i:"🥜"},
  {s:"Snacks",         n:"Cashew Nuts 150g",               c:"Nuts",          p:"low",    i:"🌰"},
  {s:"Snacks",         n:"Dried Mango Strips 100g",        c:"Dried Fruit",   p:"low",    i:"🥭"},
  {s:"Snacks",         n:"Nutella 400g",                   c:"Spreads",       p:"medium", i:"🍫"},
  {s:"Snacks",         n:"Peanut Butter (Nutrex) 400g",    c:"Spreads",       p:"high",   i:"🥜"},
  {s:"Snacks",         n:"Honey (Tropical) 500g",          c:"Spreads",       p:"medium", i:"🍯"},
  {s:"Snacks",         n:"Strawberry Jam 450g",            c:"Spreads",       p:"medium", i:"🍓"},
  // ADDITIONAL ITEMS — reaching 242+ total
  {s:"Fresh Produce",  n:"Red Capsicum x2",                c:"Vegetables",    p:"medium", i:"🫑"},
  {s:"Fresh Produce",  n:"Broccoli (head)",                c:"Brassicas",     p:"medium", i:"🥦"},
  {s:"Dry Goods",      n:"Baking Powder 100g",             c:"Baking",        p:"medium", i:"🌾"},
  {s:"Dry Goods",      n:"Drinking Chocolate 200g",        c:"Hot Drinks",    p:"medium", i:"🍫"},
  {s:"Dry Goods",      n:"Icing Sugar 500g",               c:"Baking",        p:"low",    i:"🍬"},
  {s:"Meat & Seafood", n:"Turkey Bacon 200g",              c:"Processed",     p:"low",    i:"🥓"},
  {s:"Dairy",          n:"Whipping Cream 250ml",           c:"Cream",         p:"low",    i:"🥛"},
  {s:"Frozen Foods",   n:"Frozen Coconut Milk 400ml",      c:"Frozen Staples",p:"low",    i:"🥥"},
  {s:"Bakery",         n:"Focaccia Bread loaf",            c:"Bread",         p:"low",    i:"🍞"},
  {s:"Beverages",      n:"Passion Fruit Juice 1L",         c:"Juice",         p:"medium", i:"🟡"},
  {s:"Beverages",      n:"Alvaro Malt 500ml",              c:"Malt Drinks",   p:"medium", i:"🍹"},
  {s:"Household",      n:"Dettol Hand Soap 250ml",         c:"Hand Hygiene",  p:"high",   i:"🧼"},
  {s:"Personal Care",  n:"Aquafresh Toothpaste 100g",      c:"Oral Care",     p:"medium", i:"🦷"},
  {s:"Personal Care",  n:"Dove Deodorant Roll-On 50ml",    c:"Deodorant",     p:"medium", i:"💨"},
  {s:"Baby Products",  n:"Sudocrem 250g",                  c:"Baby Skin",     p:"medium", i:"🧴"},
  {s:"Snacks",         n:"Chocolate Chip Cookies 200g",    c:"Biscuits",      p:"medium", i:"🍪"},
  {s:"Snacks",         n:"Plantain Crisps 80g",            c:"Crisps",        p:"medium", i:"🍌"},
  {s:"Snacks",         n:"Macadamia Nuts 100g",            c:"Nuts",          p:"low",    i:"🌰"},
  {s:"Snacks",         n:"Lemon Cream Biscuits 200g",      c:"Biscuits",      p:"medium", i:"🍋"}
];

const SECTION_MAP = {
  grocery:   "Fresh Produce",
  meat:      "Meat & Seafood",
  dairy:     "Dairy",
  frozen:    "Frozen Foods",
  dry:       "Dry Goods",
  bakery:    "Bakery",
  beverages: "Beverages",
  household: "Household",
  personal:  "Personal Care",
  baby:      "Baby Products",
  snacks:    "Snacks"
};
// Normalise inventory section → display name
const SECTION_DISPLAY = {
  "Fresh Produce":  "Fresh Produce",
  "Meat & Seafood": "Meat & Seafood",
  "Dairy":          "Dairy",
  "Frozen Foods":   "Frozen Foods",
  "Dry Goods":      "Dry Goods",
  "Bakery":         "Bakery",
  "Beverages":      "Beverages",
  "Household":      "Household & Cleaning",
  "Personal Care":  "Personal Care",
  "Baby Products":  "Baby Products",
  "Snacks":         "Snacks & Confectionery"
};
const SECTION_ICONS = {
  "Fresh Produce":"🥦","Meat & Seafood":"🥩","Dairy":"🥛","Frozen Foods":"🧊",
  "Dry Goods":"🌾","Bakery":"🍞","Beverages":"🥤","Household":"🧹",
  "Household & Cleaning":"🧹",
  "Personal Care":"🧴","Baby Products":"👶","Snacks":"🍫","Snacks & Confectionery":"🍫"
};

const STORES = [
  {id:"naivas",    name:"Naivas Supermarket",   short:"Naivas",    logo:"https://logo.clearbit.com/naivas.co.ke",    color:"#E31E24",bg:"#FFF5F5",  status:"Open Now",  hours:"7AM–10PM", badge:"sm-open",  rating:"4.6",tags:["Groceries","Electronics","Clothing"],locs:["Naivas Westgate, Westlands","Naivas Village Market, Gigiri","Naivas TRM, Thika Road","Naivas Galleria, Karen"]},
  {id:"quickmart", name:"Quickmart Supermarket",short:"Quickmart", logo:"https://logo.clearbit.com/quickmart.co.ke", color:"#00913F",bg:"#F0FFF4",  status:"Open Now",  hours:"7AM–10PM", badge:"sm-open",  rating:"4.4",tags:["Groceries","Bakery","Butchery"],locs:["Quickmart Kahawa, Roysambu","Quickmart Ruaka, Limuru Rd","Quickmart Kasarani"]},
  {id:"carrefour", name:"Carrefour Kenya",       short:"Carrefour", logo:"https://logo.clearbit.com/carrefour.ke",    color:"#0049B8",bg:"#F0F4FF",  status:"Open 24h",  hours:"24 Hours", badge:"sm-24h",   rating:"4.5",tags:["Hypermarket","Electronics","Fashion"],locs:["Carrefour Two Rivers, Runda","Carrefour The Hub, Karen","Carrefour Sarit Centre, Westlands"]},
  {id:"chandarana",name:"Chandarana Foodplus",   short:"Chandarana",logo:"https://logo.clearbit.com/chandarana.co.ke",color:"#D4000A",bg:"#FFF5F5",  status:"Open Now",  hours:"8AM–9PM",  badge:"sm-open",  rating:"4.5",tags:["Premium","Gourmet","Wine"],locs:["Chandarana Yaya, Kilimani","Chandarana Lavington Green","Chandarana Galleria, Karen"]},
  {id:"eastmatt",  name:"Eastmatt Supermarket",  short:"Eastmatt",  logo:"https://logo.clearbit.com/eastmatt.co.ke",  color:"#004A8F",bg:"#F0F4FF",  status:"Open Now",  hours:"7AM–9PM",  badge:"sm-open",  rating:"4.2",tags:["Groceries","Fresh","Affordable"],locs:["Eastmatt Mwiki, Kasarani","Eastmatt Rongai","Eastmatt Athi River"]},
  {id:"cleanshelf",name:"Cleanshelf Supermarket",short:"Cleanshelf",logo:"https://logo.clearbit.com/cleanshelf.co.ke",color:"#0077B6",bg:"#F0F8FF",  status:"Open Now",  hours:"7:30AM–9PM",badge:"sm-open", rating:"4.3",tags:["Groceries","Bakery","Fresh"],locs:["Cleanshelf Ngong Road","Cleanshelf Langata","Cleanshelf Kiserian"]},
  {id:"game",      name:"Game Stores Kenya",      short:"Game",      logo:"https://logo.clearbit.com/game.co.ke",      color:"#FF6A00",bg:"#FFF5EE",  status:"Open Now",  hours:"9AM–8PM",  badge:"sm-open",  rating:"4.3",tags:["Electronics","Appliances","Toys"],locs:["Game Waterfront, CBD","Game The Junction, Ngong Rd","Game Village Market"]},
  {id:"magunas",   name:"Magunas Supermarket",    short:"Magunas",   logo:"https://logo.clearbit.com/magunas.co.ke",   color:"#006400",bg:"#F0FFF0",  status:"Open Now",  hours:"7AM–9PM",  badge:"sm-open",  rating:"4.2",tags:["Groceries","Affordable","Local"],locs:["Magunas Githurai 45","Magunas Ruiru","Magunas Kenol"]},
  {id:"mulleys",   name:"Mulleys Supermarket",    short:"Mulleys",   logo:"https://logo.clearbit.com/mulleys.co.ke",   color:"#8B0000",bg:"#FFF5F5",  status:"Open Now",  hours:"8AM–9PM",  badge:"sm-open",  rating:"4.1",tags:["Groceries","Butchery"],locs:["Mulleys Westlands","Mulleys Parklands"]},
  {id:"society",   name:"Society Stores",          short:"Society",   logo:"https://logo.clearbit.com/societystores.co.ke",color:"#4A0080",bg:"#F5F0FF",status:"Open Now",  hours:"8AM–9PM",  badge:"sm-open",  rating:"4.1",tags:["Groceries","Household","Local"],locs:["Society Stores South C","Society Stores Langata Rd"]},
  {id:"khetias",   name:"Khetia's Supermarket",    short:"Khetia's",  logo:"https://logo.clearbit.com/khetias.co.ke",   color:"#CC4400",bg:"#FFF5EE",  status:"Open Now",  hours:"7:30AM–9PM",badge:"sm-open", rating:"4.3",tags:["Groceries","Indian Spices","Fresh"],locs:["Khetia's Nakuru","Khetia's Eldoret","Khetia's Kisumu"]},
  {id:"uchumi",    name:"Uchumi Supermarket",      short:"Uchumi",    logo:"https://logo.clearbit.com/uchumi.com",      color:"#006633",bg:"#F0FFF4",  status:"Open Now",  hours:"8AM–8PM",  badge:"sm-open",  rating:"3.9",tags:["Groceries","Pharmacy"],locs:["Uchumi Rongai","Uchumi Buruburu","Uchumi Langata"]}
];

/* ════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════ */
let currentScreen = 'home', prevScreen = 'home';
let bookedTrips = [], selectedTier = null, isAgent = false, currentDetail = 'penthouse';
let recentlyViewed = [];
let rideFor = 'me';

/* ════ PROPERTY INTELLIGENCE — match score, why, area feel, activity ════ */
const propertyIntel = {
  penthouse: { match:96, readiness:'ready', viewers:34, savedToday:6,
    why:['📍 Matches your saved searches in Kilimani','💰 Fits comfortably within your usual budget range','🛏️ Bedroom count matches your last 3 viewings'],
    feel:{walk:88,quiet:62,family:74} },
  villa: { match:91, readiness:'ready', viewers:21, savedToday:9,
    why:['🌳 Garden space matches your lifestyle preferences','🚗 Quiet estate similar to homes you\'ve favourited','🏡 Larger sqm than your recent searches — try before you decide'],
    feel:{walk:54,quiet:90,family:92} },
  apt:   { match:88, readiness:'ready', viewers:42, savedToday:11,
    why:['🏙️ Central location near your frequent ride destinations','💰 Within your typical monthly budget','⚡ Fast-moving listing — high recent interest'],
    feel:{walk:95,quiet:48,family:58} },
  studio: { match:84, readiness:'prep', viewers:18, savedToday:4,
    why:['🎓 Compact layout suited to your saved studio searches','📍 Westlands — matches your recent location filters','✨ New build, freshly listed this month'],
    feel:{walk:90,quiet:55,family:40} },
  townhouse: { match:93, readiness:'ready', viewers:15, savedToday:5,
    why:['👨‍👩‍👧 Family-friendly layout matching your saved filters','🛡️ Gated estate — high safety score','🌳 Garden access similar to your favourited listings'],
    feel:{walk:60,quiet:85,family:96} },
  bungalow: { match:89, readiness:'prep', viewers:9, savedToday:2,
    why:['🏡 Single-storey layout matching accessibility preferences','🌳 Garden space in a quiet residential pocket','📐 Larger sqm relative to similar-priced listings'],
    feel:{walk:58,quiet:88,family:90} },
};

function renderPropertyIntel(id) {
  const intel = propertyIntel[id] || propertyIntel.penthouse;
  const mb = document.getElementById('detail-match-badge');
  if (mb) mb.innerHTML = `<span class="mb-pct">${intel.match}%</span> Match for You`;
  const rb = document.getElementById('detail-readiness-badge');
  if (rb) {
    if (intel.readiness === 'ready') { rb.className='readiness-badge ready'; rb.textContent='✓ Ready to View'; }
    else { rb.className='readiness-badge prep'; rb.textContent='🧹 Prepping · Ready in 2 days'; }
  }
  const al = document.getElementById('detail-activity-line');
  if (al) al.innerHTML = `<span class="activity-dot"></span><span>${intel.viewers} people viewed this week · ${intel.savedToday} saved today</span>`;
  const wb = document.getElementById('why-body');
  if (wb) wb.innerHTML = intel.why.map(w => `<div class="why-item">${w}</div>`).join('');
  const afg = document.getElementById('area-feel-grid');
  if (afg) afg.innerHTML = `
    <div class="feel-box"><div class="feel-lbl">Walkable</div><div class="feel-bar-track"><div class="feel-bar-fill" style="width:${intel.feel.walk}%;background:#3DAF66"></div></div><div class="feel-val">${intel.feel.walk}</div></div>
    <div class="feel-box"><div class="feel-lbl">Quiet</div><div class="feel-bar-track"><div class="feel-bar-fill" style="width:${intel.feel.quiet}%;background:#007AFF"></div></div><div class="feel-val">${intel.feel.quiet}</div></div>
    <div class="feel-box"><div class="feel-lbl">Family</div><div class="feel-bar-track"><div class="feel-bar-fill" style="width:${intel.feel.family}%;background:#FF9500"></div></div><div class="feel-val">${intel.feel.family}</div></div>`;
  // close why-panel on render
  const wp = document.getElementById('why-panel'); if (wp) wp.classList.remove('open');
}

/* ════ RECENTLY VIEWED ════ */
function pushRecentlyViewed(id) {
  recentlyViewed = recentlyViewed.filter(x => x !== id);
  recentlyViewed.unshift(id);
  recentlyViewed = recentlyViewed.slice(0, 6);
  renderRecentlyViewed();
}
function renderRecentlyViewed() {
  const section = document.getElementById('recently-viewed-section');
  const scroll   = document.getElementById('recently-viewed-scroll');
  if (!section || !scroll) return;
  if (!recentlyViewed.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  scroll.innerHTML = recentlyViewed.map(id => {
    const d = detailData[id] || detailData.penthouse;
    return `<div class="feat-card" onclick="openDetail('${id}')">
      <div class="feat-img" style="background:#ddd;padding:0"><img src="${d.photo}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'"></div>
      <div class="feat-body"><div class="ftitle">${d.title}</div><div class="floc">${d.location.split('·')[0]}</div><div class="fbtm"><div class="fprice">${d.price.replace('KES','KES').replace(',000','K')}<span style="font-size:9px;color:var(--ink3)">/mo</span></div></div></div>
    </div>`;
  }).join('');
}

/* ════ BOOK LATER ════ */
function bookLater() {
  toast('🗓️ Reminder set! We\'ll notify you to schedule this viewing.');
}

/* ════ WHO IS THIS RIDE FOR ════ */
function setRideFor(type, el) {
  rideFor = type;
  document.querySelectorAll('.whofor-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const notes = {
    me:'Standard verification applies.',
    family:'Family mode: extra seat priority, no change in safety rules.',
    student:'Student discount auto-applied at checkout.',
    vip:'VIP Guest: concierge-grade vehicle prioritised.',
    delivery:'Delivery mode: no passenger seat required, item verification at pickup.'
  };
  toast(`✓ Ride for: ${type.charAt(0).toUpperCase()+type.slice(1)} — ${notes[type]}`);
  updateFareBreakdown();
}

/* ════ FARE TRANSPARENCY ════ */
function updateFareBreakdown() {
  const base = 150;
  const dist = 120;
  let driverShare = 245, platform = 55, safety = 25;
  if (rideFor === 'vip') { driverShare = Math.round(driverShare*1.4); safety = Math.round(safety*1.3); }
  if (rideFor === 'delivery') { safety = Math.round(safety*0.7); }
  const total = base + dist + 0; // driver/platform/safety are sub-components of the fare, shown for transparency
  const fbBase = document.getElementById('fb-base');
  if (fbBase) {
    document.getElementById('fb-base').textContent     = `KSh ${base}`;
    document.getElementById('fb-dist').textContent     = `KSh ${dist}`;
    document.getElementById('fb-driver').textContent   = `KSh ${driverShare}`;
    document.getElementById('fb-platform').textContent = `KSh ${platform}`;
    document.getElementById('fb-safety').textContent   = `KSh ${safety}`;
    document.getElementById('fb-total').textContent    = `KSh ${base+dist}`;
  }
}

/* ════ I'VE ARRIVED ════ */
function confirmArrived() {
  toast('📍 Arrival confirmed · Geo-verified · Viewing timestamp logged ✓');
}


// detailData defined below with full photo data
const tierCfg = {
  general:{cta:'Confirm General Ride →',cls:'tier-cta-btn',       heroBg:'#EAF5EE',checkBg:'#3DAF66',heading:'🚗 Ride Confirmed!',   sub:'Property discovery active',          driver:'James Otieno · ★ 4.95',vehicle:'Toyota Axio · KBQ 412Z'},
  women:  {cta:'Confirm SafeRide 🌸',   cls:'tier-cta-btn tw-btn',heroBg:'#FFF0F2',checkBg:'#E04060',heading:'🌸 SafeRide Confirmed!',sub:'Verified female driver assigned',    driver:'Sarah Kamau · ★ 4.98',  vehicle:'Honda Fit · KCB 881Y'},
  student:{cta:'Confirm Campus Ride 🎓',cls:'tier-cta-btn ts-btn',heroBg:'#EEF4FF',checkBg:'#3A82E0',heading:'🎓 Campus Confirmed!',  sub:'BedsitterMode active · 5 listings',  driver:'David Mwangi · ★ 4.88', vehicle:'Nissan Note (Pool) · KDA 220X'},
  vip:    {cta:'Confirm Elite Tour 👑', cls:'tier-cta-btn tv-btn',heroBg:'#FFF4E8',checkBg:'#D4780A',heading:'👑 Elite Confirmed!',   sub:'Concierge preparing your itinerary', driver:'Michael Njoroge · ★ 5.0',vehicle:'Tesla Model 3 · KDG 001E'}
};
const tierFares = {general:'KES 350',women:'KES 520',student:'KES 200',vip:'KES 2,500'};
const tierNames = {general:'🚗 General Ride',women:'🌸 SafeRide Women',student:'🎓 Campus Ride',vip:'👑 Elite Tour'};

/* ════════════════════════════════════════════════════════════════
   RIDE PLATE — Intelligent Urban Lifestyle Layer v2
   Context-aware food, café, grocery & convenience
   Adapts to: General · SafeRide Women · Students · VIP Elite
════════════════════════════════════════════════════════════════ */

const RP = {

  segments: {
    general: {
      key:'general', label:'General', emoji:'🚗',
      color:'#FF6B35', bg:'#FFF3EE', dark:'#C84400',
      gradient:'linear-gradient(135deg,#FF6B35,#FF9A5C)',
      hero:{ title:'Quick Bites Near Your Route', sub:'Fast, affordable & delicious — order in 3 taps', emoji:'🍔' },
      ctaLabel:'Popular Near Your Route', budgetLabel:'Under KSh 350',
      featuredCats:['fast','grill','local','breakfast','snacks','convenience'],
      accentBadge:'🔥 Trending'
    },
    women: {
      key:'women', label:'SafeRide', emoji:'🌸',
      color:'#C0406A', bg:'#FFF0F5', dark:'#8A0040',
      gradient:'linear-gradient(135deg,#C0406A,#E06088)',
      hero:{ title:'Comfort Stops Along Your Journey', sub:'Verified, hygienic & women-friendly dining', emoji:'☕' },
      ctaLabel:'Highly Rated Women-Friendly Cafés', budgetLabel:'Premium Picks',
      featuredCats:['cafes','healthy','brunch','desserts','premium','wellness'],
      accentBadge:'✓ Verified Safe'
    },
    student: {
      key:'student', label:'Campus', emoji:'🎓',
      color:'#0070FF', bg:'#EEF4FF', dark:'#0040B0',
      gradient:'linear-gradient(135deg,#0070FF,#40A0FF)',
      hero:{ title:'Campus Favorites & Budget Deals', sub:'Meals under KSh 300 · Group orders · Split bills', emoji:'🍕' },
      ctaLabel:'Budget Combos Near Your Viewing', budgetLabel:'Under KSh 300',
      featuredCats:['budget','fast','snacks','pizza','local','latenight'],
      accentBadge:'💸 Best Value'
    },
    vip: {
      key:'vip', label:'Elite', emoji:'👑',
      color:'#B8860B', bg:'#FDFAF0', dark:'#7A5500',
      gradient:'linear-gradient(135deg,#B8860B,#D4A820)',
      hero:{ title:'Executive Dining Along Your Route', sub:'Curated fine dining · Concierge recommendations', emoji:'🥂' },
      ctaLabel:'Luxury Cafés Along Your Route', budgetLabel:'Premium Experiences',
      featuredCats:['premium','finedining','cafes','sushi','healthy','artisan'],
      accentBadge:'👑 Exclusive'
    }
  },

  categories: [
    { id:'recommended', label:'For You',     emoji:'✨', all:true },
    { id:'route',       label:'On Route',    emoji:'📍', all:true },
    { id:'nearby',      label:'Nearby',      emoji:'📡', all:true },
    { id:'fast',        label:'Fast Food',   emoji:'🍔', segs:['general','student'] },
    { id:'grill',       label:'Nyama Choma', emoji:'🥩', segs:['general','student','vip'] },
    { id:'local',       label:'Local Kenyan',emoji:'🍛', segs:['general','student'] },
    { id:'pizza',       label:'Pizza',       emoji:'🍕', segs:['general','student'] },
    { id:'breakfast',   label:'Breakfast',   emoji:'🍳', all:true },
    { id:'cafes',       label:'Cafés',       emoji:'☕', all:true },
    { id:'healthy',     label:'Healthy',     emoji:'🥗', segs:['women','vip','general'] },
    { id:'brunch',      label:'Brunch',      emoji:'🥞', segs:['women','vip'] },
    { id:'desserts',    label:'Desserts',    emoji:'🍰', all:true },
    { id:'premium',     label:'Fine Dining', emoji:'🥂', segs:['vip','women'] },
    { id:'finedining',  label:'Executive',   emoji:'🍽️', segs:['vip'] },
    { id:'sushi',       label:'Sushi',       emoji:'🍣', segs:['vip','women'] },
    { id:'artisan',     label:'Artisan',     emoji:'☕', segs:['vip','women'] },
    { id:'budget',      label:'Under 300',   emoji:'💸', segs:['student'] },
    { id:'latenight',   label:'Late Night',  emoji:'🌙', segs:['student','general'] },
    { id:'snacks',      label:'Quick Snacks',emoji:'🍿', all:true },
    { id:'grocery',     label:'Groceries',   emoji:'🛒', all:true },
    { id:'wellness',    label:'Wellness',    emoji:'🌿', segs:['women','vip'] },
    { id:'convenience', label:'Convenience', emoji:'⚡', all:true },
  ],

  merchants: [
    // ── GENERAL / FAST FOOD ──────────────────────────────────────────
    { id:'jf1', name:'Java House', cat:'cafes', seg:['general','women','vip'],
      tag:'Premium Café Chain', rating:4.8, reviews:2847, eta:'12 min',
      price:'KSh 350–900', emoji:'☕', bg:'#2C2C2C', accent:'#F5A623',
      badge:'', popular:true,
      items:['Americano KSh 280','Latte KSh 320','Croissant KSh 180','Club Sandwich KSh 680','Waffles KSh 550'] },
    { id:'jf2', name:'Kenchic Express', cat:'fast', seg:['general','student'],
      tag:'Fried Chicken · Fast Food', rating:4.5, reviews:5621, eta:'8 min',
      price:'KSh 200–550', emoji:'🍗', bg:'#E84B0A', accent:'#FFC107',
      badge:'🔥 Most Ordered', popular:true,
      items:['2-pc Chicken KSh 280','Family Bucket KSh 950','Chicken Burger KSh 350','Fries KSh 120','Soda KSh 80'] },
    { id:'jf3', name:'Pizza Inn', cat:'pizza', seg:['general','student'],
      tag:'Pizza · Pasta · Sides', rating:4.4, reviews:3892, eta:'18 min',
      price:'KSh 350–1,200', emoji:'🍕', bg:'#C0392B', accent:'#F39C12',
      badge:'', popular:true,
      items:['Margherita 9" KSh 580','BBQ Chicken KSh 780','Garlic Bread KSh 180','Pasta KSh 480','Brownie KSh 220'] },
    { id:'jf4', name:'Chicken Inn', cat:'fast', seg:['general','student'],
      tag:'Fried Chicken · Burgers', rating:4.3, reviews:4210, eta:'10 min',
      price:'KSh 180–600', emoji:'🍔', bg:'#E74C3C', accent:'#F1C40F',
      badge:'💸 Affordable', popular:true,
      items:['Chicken Burger KSh 280','2-pc Chicken KSh 250','Family Pack KSh 850','Fries KSh 100','Soda KSh 80'] },
    { id:'jf5', name:'Nyama Mama', cat:'grill', seg:['general','vip'],
      tag:'Modern Kenyan Grill', rating:4.8, reviews:1893, eta:'22 min',
      price:'KSh 650–2,200', emoji:'🥩', bg:'#8B3A0A', accent:'#FF6B35',
      badge:'⭐ Top Rated', popular:true,
      items:['Nyama Choma 500g KSh 950','Ugali & Sukuma KSh 280','Tilapia Whole KSh 1,100','Mukimo KSh 320','Pilau KSh 480'] },
    { id:'jf6', name:'Galitos', cat:'grill', seg:['general','student'],
      tag:'Peri-Peri Chicken Grill', rating:4.6, reviews:2341, eta:'15 min',
      price:'KSh 380–1,100', emoji:'🔥', bg:'#C0392B', accent:'#E74C3C',
      badge:'', popular:true,
      items:['Peri Chicken KSh 580','Pita Wrap KSh 380','Grilled Ribs KSh 980','Coleslaw KSh 120','Fries KSh 150'] },
    { id:'jf7', name:'Art Caffe', cat:'cafes', seg:['women','vip','general'],
      tag:'Café · Brunch · Desserts', rating:4.7, reviews:3102, eta:'14 min',
      price:'KSh 400–1,400', emoji:'☕', bg:'#4A3728', accent:'#D4A574',
      badge:'✓ Verified', popular:true,
      items:['Flat White KSh 340','Eggs Benedict KSh 680','Avocado Toast KSh 580','Cheesecake KSh 420','Granola Bowl KSh 480'] },
    { id:'jf8', name:'Dormans Coffee', cat:'cafes', seg:['women','vip','general'],
      tag:'Artisan Coffee · Pastries', rating:4.7, reviews:1840, eta:'11 min',
      price:'KSh 280–850', emoji:'☕', bg:'#3E2723', accent:'#BCAAA4',
      badge:'✓ Verified', popular:false,
      items:['Espresso KSh 220','Cappuccino KSh 300','Croissant KSh 160','Muffin KSh 180','Cold Brew KSh 380'] },
    // ── WOMEN / WELLNESS ─────────────────────────────────────────────
    { id:'jf9', name:'Harvest Kitchen', cat:'healthy', seg:['women','vip'],
      tag:'Healthy Bowls · Vegan', rating:4.8, reviews:920, eta:'16 min',
      price:'KSh 480–1,100', emoji:'🥗', bg:'#2E7D32', accent:'#81C784',
      badge:'✓ Verified Safe', popular:true,
      items:['Grain Bowl KSh 680','Smoothie KSh 380','Avocado Salad KSh 580','Vegan Wrap KSh 520','Chia Pudding KSh 320'] },
    { id:'jf10', name:'The Wellness Hub', cat:'wellness', seg:['women'],
      tag:'Smoothies · Wellness Bowls', rating:4.9, reviews:614, eta:'14 min',
      price:'KSh 320–900', emoji:'🌿', bg:'#1B5E20', accent:'#A5D6A7',
      badge:'✓ Women-Friendly', popular:true,
      items:['Detox Smoothie KSh 380','Açaí Bowl KSh 580','Green Juice KSh 280','Protein Bowl KSh 620','Herbal Tea KSh 180'] },
    { id:'jf11', name:'Yellow Owl Café', cat:'brunch', seg:['women','vip'],
      tag:'Brunch · Pastries · Coffee', rating:4.8, reviews:788, eta:'18 min',
      price:'KSh 500–1,600', emoji:'🥞', bg:'#F57F17', accent:'#FFF176',
      badge:'✓ Verified Safe', popular:false,
      items:['Pancake Stack KSh 620','Shakshuka KSh 680','Pastry Box KSh 480','Iced Latte KSh 360','Fruit Bowl KSh 380'] },
    // ── STUDENT / BUDGET ─────────────────────────────────────────────
    { id:'jf12', name:'Campus Bites', cat:'budget', seg:['student'],
      tag:'Budget Meals · Fast & Affordable', rating:4.3, reviews:2108, eta:'8 min',
      price:'KSh 120–280', emoji:'🍱', bg:'#1565C0', accent:'#90CAF9',
      badge:'💸 Best Value', popular:true,
      items:['Rice + Stew KSh 150','Chapati + Beans KSh 120','Chips Kuku KSh 200','Soda KSh 60','Mandazi 3pc KSh 50'] },
    { id:'jf13', name:'Street Vibes NBO', cat:'local', seg:['student','general'],
      tag:'Street Food · Local Kenyan', rating:4.4, reviews:3299, eta:'6 min',
      price:'KSh 80–300', emoji:'🍛', bg:'#4E342E', accent:'#FF8A65',
      badge:'', popular:true,
      items:['Nyama Choma 250g KSh 280','Ugali + Fish KSh 180','Mutura KSh 80','Smokies KSh 50','Mahindi KSh 30'] },
    { id:'jf14', name:'Debonairs Pizza', cat:'pizza', seg:['student','general'],
      tag:'Pizza · Wraps · Value Combos', rating:4.2, reviews:4521, eta:'20 min',
      price:'KSh 280–950', emoji:'🍕', bg:'#B71C1C', accent:'#EF9A9A',
      badge:'💸 Student Deal', popular:false,
      items:['Personal Pizza KSh 320','Chicken Wrap KSh 280','Pizza Slice KSh 150','Combo Deal KSh 450','Garlic Sticks KSh 120'] },
    { id:'jf15', name:'Late Night Snacks NBO', cat:'latenight', seg:['student','general'],
      tag:'Open Until 3AM · Delivery', rating:4.1, reviews:1890, eta:'25 min',
      price:'KSh 100–400', emoji:'🌙', bg:'#1A1A2E', accent:'#9C27B0',
      badge:'🌙 Open Late', popular:true,
      items:['Chips Masala KSh 180','Samosa 3pc KSh 120','Hot Dog KSh 150','Energy Drink KSh 100','Donuts 2pc KSh 120'] },
    // ── VIP / ELITE ──────────────────────────────────────────────────
    { id:'jf16', name:'Talisman Restaurant', cat:'finedining', seg:['vip'],
      tag:'Fine Dining · Karen Nairobi', rating:4.9, reviews:1243, eta:'28 min',
      price:'KSh 2,500–8,000', emoji:'🍽️', bg:'#1A1200', accent:'#D4A820',
      badge:'👑 Elite Pick', popular:true,
      items:['Beef Tenderloin KSh 4,200','Lobster Thermidor KSh 6,800','Chef Tasting Menu KSh 7,500','Dessert Platter KSh 1,800','Wine Pairing KSh 3,500'] },
    { id:'jf17', name:'Kikao Executive Café', cat:'premium', seg:['vip'],
      tag:'Executive Lounge · Artisan Coffee', rating:4.8, reviews:621, eta:'15 min',
      price:'KSh 800–3,500', emoji:'☕', bg:'#0D0D0D', accent:'#D4A820',
      badge:'👑 Concierge Recommended', popular:true,
      items:['Single Origin Espresso KSh 480','Wagyu Brisket KSh 3,200','Smoked Salmon KSh 2,100','Artisan Cheese Board KSh 1,800','Premium Tea KSh 680'] },
    { id:'jf18', name:'Sushi Nori Nairobi', cat:'sushi', seg:['vip','women'],
      tag:'Premium Japanese · Sushi Bar', rating:4.8, reviews:892, eta:'30 min',
      price:'KSh 1,800–6,000', emoji:'🍣', bg:'#0D1421', accent:'#E53935',
      badge:'⭐ Top 1% Rated', popular:false,
      items:['Dragon Roll KSh 1,800','Sashimi Platter KSh 3,200','Miso Soup KSh 380','Wagyu Nigiri KSh 2,400','Sake KSh 1,200'] },
    { id:'jf19', name:'Artisan Roasters KE', cat:'artisan', seg:['vip','women'],
      tag:'Specialty Coffee · Minimal', rating:4.9, reviews:502, eta:'12 min',
      price:'KSh 420–1,200', emoji:'☕', bg:'#1C1008', accent:'#C8A96E',
      badge:'', popular:false,
      items:['Pour Over KSh 520','Cold Brew KSh 480','Cortado KSh 380','Pastry Pairing KSh 680','Coffee Flight KSh 1,100'] },
    // ── DESSERTS ─────────────────────────────────────────────────────
    { id:'jf20', name:'Cake City', cat:'desserts', seg:['general','women','student','vip'],
      tag:'Cakes · Milkshakes · Donuts', rating:4.6, reviews:2891, eta:'15 min',
      price:'KSh 180–980', emoji:'🎂', bg:'#880E4F', accent:'#F48FB1',
      badge:'', popular:true,
      items:['Chocolate Cake Slice KSh 280','Milkshake KSh 320','Donut KSh 120','Cupcake KSh 180','Ice Cream KSh 220'] },
    { id:'jf21', name:'The Ice Cream Lab', cat:'desserts', seg:['general','women','student'],
      tag:'Artisan Ice Cream · Waffles', rating:4.7, reviews:1490, eta:'10 min',
      price:'KSh 150–680', emoji:'🍦', bg:'#E91E8C', accent:'#F8BBD9',
      badge:'🌟 Fan Favourite', popular:true,
      items:['Single Scoop KSh 150','Waffle Cone KSh 280','Brownie Sundae KSh 480','Shake KSh 380','2-Scoop Cup KSh 280'] },
    // ── GROCERY / CONVENIENCE ────────────────────────────────────────
    { id:'jf22', name:'Fresh Basket', cat:'grocery', seg:['general','women','student','vip'],
      tag:'Grocery Essentials · 30 min delivery', rating:4.5, reviews:1820, eta:'28 min',
      price:'KSh 50–2,000', emoji:'🛒', bg:'#1B5E20', accent:'#69F0AE',
      badge:'🚀 Fast Delivery', popular:true,
      items:['Full Milk 1L · KSh 65','Farm Eggs 6pk · KSh 85','Sliced Bread · KSh 55','Bottled Water 6pk · KSh 180','Cereal Pack · KSh 280'] },
    { id:'jf23', name:'QuickMart Express', cat:'convenience', seg:['general','student'],
      tag:'Quick Convenience · Open 24h', rating:4.2, reviews:3401, eta:'12 min',
      price:'KSh 30–500', emoji:'⚡', bg:'#00897B', accent:'#80CBC4',
      badge:'⚡ Open 24h', popular:true,
      items:['Water 500ml · KSh 30','Energy Drink · KSh 80','Juice 330ml · KSh 60','Tissues Pack · KSh 45','Chewing Gum · KSh 30'] },
    { id:'jf24', name:'Smoothie Stop', cat:'healthy', seg:['women','student','general'],
      tag:'Fresh Smoothies · Juices', rating:4.6, reviews:1102, eta:'8 min',
      price:'KSh 180–450', emoji:'🥤', bg:'#00695C', accent:'#80CBC4',
      badge:'✓ Verified', popular:false,
      items:['Mango Passion KSh 250','Green Detox KSh 280','Strawberry Banana KSh 220','Protein Shake KSh 380','Aloe Vera KSh 180'] },
  ],
};

/* ─── AI context engine ─────────────────────────────────────── */
function getAIContext() {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return { cat:'breakfast',  emoji:'🌅', label:'Morning Fuel',     title:'Start Your Day Right',          sub:'Breakfast & coffee near your viewing' };
  if (h >= 10 && h < 12) return { cat:'brunch',     emoji:'☀️', label:'Brunch Time',      title:'Brunch Before Your Viewing',    sub:'Top brunch spots on your route' };
  if (h >= 12 && h < 15) return { cat:'fast',       emoji:'🍔', label:'Lunch Rush',       title:'Quick Lunch Near You',          sub:'Fast, fresh meals on your route' };
  if (h >= 15 && h < 18) return { cat:'cafes',      emoji:'☕', label:'Afternoon Boost',  title:'Coffee Break Ahead',            sub:'Top cafés 2 mins from your route' };
  if (h >= 18 && h < 22) return { cat:'grill',      emoji:'🔥', label:'Dinner Time',      title:'Evening Dining Near You',       sub:'AI-recommended dinner spots tonight' };
  return                         { cat:'latenight',  emoji:'🌙', label:'Night Cravings',   title:'Late-Night Picks Open Now',     sub:'Desserts & bites near your destination' };
}

/* ─── State ─────────────────────────────────────────────────── */
let ridePlateCategory = 'recommended';
let ridePlateSeg      = 'general';

/* ─── Main render function ──────────────────────────────────── */
function renderRidePlate() {
  const body = document.getElementById('shop-body');
  if (!body) return;

  const seg     = ridePlateSeg;
  const segCfg  = RP.segments[seg];
  const aiCtx   = getAIContext();

  /* items for this segment + optional cat filter */
  const pool = (catId) => {
    let items = RP.merchants.filter(m => m.seg.includes(seg));
    if (catId === 'nearby') {
      // Nearby = closest to current location right now, sorted by shortest ETA
      items = [...items].sort((a, b) => parseInt(a.eta) - parseInt(b.eta));
    } else if (catId && catId !== 'recommended' && catId !== 'route') {
      items = items.filter(m => m.cat === catId);
    } else {
      items = items.filter(m => m.popular);
    }
    return items;
  };

  /* visible categories for segment */
  const visCats = RP.categories.filter(c =>
    c.all || (c.segs && c.segs.includes(seg))
  );

  const current = pool(ridePlateCategory);

  /* ── Segment selector strip ── */
  const segStrip = Object.values(RP.segments).map(s => {
    const active = s.key === seg;
    return `<div onclick="ridePlateSeg='${s.key}';ridePlateCategory='recommended';renderRidePlate()"
      style="flex-shrink:0;display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:100px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${active ? s.color : 'var(--border)'};background:${active ? s.gradient : 'var(--card)'};color:${active ? '#fff' : 'var(--ink3)'};transition:all .2s;box-shadow:${active ? '0 4px 14px ' + s.color + '44' : 'none'}">
      ${s.emoji} ${s.label}
    </div>`;
  }).join('');

  /* ── Category chips ── */
  const catChips = visCats.map(cat => {
    const active = cat.id === ridePlateCategory;
    return `<div onclick="ridePlateCategory='${cat.id}';renderRidePlate()"
      style="flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border:1.5px solid ${active ? segCfg.color : 'var(--border)'};background:${active ? segCfg.bg : 'var(--card)'};color:${active ? segCfg.color : 'var(--ink2)'};transition:all .2s">
      ${cat.emoji} ${cat.label}
    </div>`;
  }).join('');

  /* ── Merchant card builder ── */
  const merchantCard = (m) => `
    <div onclick="openMerchant('${m.id}')"
      style="background:var(--card);border:.5px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);cursor:pointer;transition:transform .18s,box-shadow .18s;flex-shrink:0;width:200px"
      onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.13)'"
      onmouseleave="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,.07)'">
      <!-- Hero -->
      <div style="height:110px;background:${m.bg};display:flex;align-items:center;justify-content:center;font-size:48px;position:relative">
        ${m.emoji}
        ${m.badge ? `<div style="position:absolute;top:8px;left:8px;background:${segCfg.gradient};color:white;padding:3px 9px;border-radius:100px;font-size:9px;font-weight:800;letter-spacing:.3px">${m.badge}</div>` : ''}
        <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.55);color:white;padding:3px 8px;border-radius:100px;font-size:9px;font-weight:700;backdrop-filter:blur(6px)">⏱ ${m.eta}</div>
      </div>
      <!-- Info -->
      <div style="padding:11px 12px 13px">
        <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:2px">${m.name}</div>
        <div style="font-size:10px;color:var(--ink3);margin-bottom:6px">${m.tag}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:4px">
            <span style="color:#F59E0B;font-size:11px">★</span>
            <span style="font-size:11px;font-weight:700">${m.rating}</span>
            <span style="font-size:10px;color:var(--ink3)">(${m.reviews.toLocaleString()})</span>
          </div>
          <span style="font-size:10px;font-weight:600;color:${segCfg.color}">${m.price}</span>
        </div>
        <button onclick="event.stopPropagation();openMerchant('${m.id}')"
          style="margin-top:9px;width:100%;background:${segCfg.gradient};color:white;border:none;border-radius:10px;padding:8px;font-size:11px;font-weight:700;cursor:pointer">
          Order Now →
        </button>
      </div>
    </div>`;

  /* ── Large list card ── */
  const listCard = (m) => `
    <div onclick="openMerchant('${m.id}')"
      style="background:var(--card);border:.5px solid var(--border);border-radius:14px;display:flex;gap:12px;overflow:hidden;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.06);transition:box-shadow .18s"
      onmouseenter="this.style.boxShadow='0 6px 20px rgba(0,0,0,.11)'"
      onmouseleave="this.style.boxShadow='0 1px 6px rgba(0,0,0,.06)'">
      <div style="width:80px;height:80px;background:${m.bg};display:flex;align-items:center;justify-content:center;font-size:34px;flex-shrink:0">${m.emoji}</div>
      <div style="padding:10px 12px 10px 0;flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-size:13px;font-weight:700;color:var(--ink)">${m.name}</div>
          <span style="font-size:9px;font-weight:700;background:${segCfg.bg};color:${segCfg.color};padding:3px 7px;border-radius:100px;flex-shrink:0;margin-left:8px">⏱ ${m.eta}</span>
        </div>
        <div style="font-size:10px;color:var(--ink3);margin-top:1px">${m.tag}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <span style="font-size:11px;color:#F59E0B">★ ${m.rating}</span>
          <span style="font-size:10px;color:var(--ink3)">(${m.reviews.toLocaleString()})</span>
          <span style="font-size:10px;font-weight:700;color:${segCfg.color};margin-left:auto">${m.price}</span>
        </div>
        ${m.badge ? `<div style="margin-top:5px;display:inline-block;background:${segCfg.bg};color:${segCfg.color};padding:2px 8px;border-radius:100px;font-size:9px;font-weight:700">${m.badge}</div>` : ''}
      </div>
    </div>`;

  /* ── SEGMENT-SPECIFIC HERO BANNERS ── */
  const heroBanners = {
    general: `
      <div style="background:linear-gradient(135deg,#FF6B35,#FF9A5C);border-radius:16px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden;cursor:pointer" onclick="ridePlateCategory='fast';renderRidePlate()">
        <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:56px;opacity:.2">🍔</div>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">${aiCtx.emoji} ${aiCtx.label}</div>
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.15;margin-bottom:4px">${aiCtx.title}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.78);margin-bottom:14px">${aiCtx.sub}</div>
        <div style="display:flex;gap:8px">
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='fast';renderRidePlate()">Fast Food →</div>
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='grill';renderRidePlate()">Nyama Choma 🥩</div>
        </div>
      </div>`,
    women: `
      <div style="background:linear-gradient(135deg,#C0406A,#E06088);border-radius:16px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden;cursor:pointer" onclick="ridePlateCategory='cafes';renderRidePlate()">
        <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:56px;opacity:.2">☕</div>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">✓ Verified & Trusted</div>
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.15;margin-bottom:4px">Comfort Stops Along Your Journey</div>
        <div style="font-size:11px;color:rgba(255,255,255,.78);margin-bottom:14px">Verified, hygienic & women-friendly dining</div>
        <div style="display:flex;gap:8px">
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='healthy';renderRidePlate()">Healthy Bowls 🥗</div>
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='cafes';renderRidePlate()">Calm Cafés ☕</div>
        </div>
      </div>`,
    student: `
      <div style="background:linear-gradient(135deg,#0070FF,#40A0FF);border-radius:16px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden;cursor:pointer" onclick="ridePlateCategory='budget';renderRidePlate()">
        <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:56px;opacity:.2">🍕</div>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">💸 Student Deals Active</div>
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.15;margin-bottom:4px">Meals Under KSh 300</div>
        <div style="font-size:11px;color:rgba(255,255,255,.78);margin-bottom:14px">Budget combos · Group orders · Split bills</div>
        <div style="display:flex;gap:8px">
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='budget';renderRidePlate()">Budget Meals →</div>
          <div style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:white;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='latenight';renderRidePlate()">Late Night 🌙</div>
        </div>
      </div>`,
    vip: `
      <div style="background:linear-gradient(135deg,#1A1200,#3A2800);border-radius:16px;padding:18px;margin-bottom:16px;position:relative;overflow:hidden;cursor:pointer;border:1px solid rgba(212,168,32,.25)" onclick="ridePlateCategory='finedining';renderRidePlate()">
        <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:56px;opacity:.15">🥂</div>
        <div style="font-size:11px;font-weight:700;color:rgba(212,168,32,.85);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">👑 Concierge Curated</div>
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:white;line-height:1.15;margin-bottom:4px">Executive Dining Along Your Route</div>
        <div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:14px">Handpicked for your Elite experience</div>
        <div style="display:flex;gap:8px">
          <div style="background:rgba(212,168,32,.18);border:1px solid rgba(212,168,32,.35);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:#D4A820;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='finedining';renderRidePlate()">Fine Dining →</div>
          <div style="background:rgba(212,168,32,.18);border:1px solid rgba(212,168,32,.35);border-radius:10px;padding:7px 13px;font-size:10px;font-weight:700;color:#D4A820;cursor:pointer" onclick="event.stopPropagation();ridePlateCategory='artisan';renderRidePlate()">Artisan Coffee ☕</div>
        </div>
      </div>`
  };

  /* ── Route insight card ── */
  const routeCard = `
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-mid));border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:13px">
      <div style="width:42px;height:42px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📍</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:white">Along Your Ride2View Route</div>
        <div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:2px">AI found ${current.length} great spots near Kilimani → Westlands</div>
      </div>
      <div style="background:rgba(255,255,255,.2);border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;color:white;cursor:pointer;white-space:nowrap" onclick="toast('🗺️ Opening route map…')">Map View 🗺️</div>
    </div>`;

  /* ── Nearby insight card — current location, not trip-based ── */
  const nearbyCard = `
    <div style="background:linear-gradient(135deg,#0070FF,#3FA0FF);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:13px">
      <div style="width:42px;height:42px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📡</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:white">Near You Right Now</div>
        <div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:2px">${current.length} spots within walking distance of your current location</div>
      </div>
      <div style="background:rgba(255,255,255,.2);border-radius:8px;padding:6px 10px;font-size:10px;font-weight:700;color:white;cursor:pointer;white-space:nowrap" onclick="toast('🗺️ Opening nearby map…')">Map View 🗺️</div>
    </div>`;

  /* ── FINAL HTML ── */
  body.innerHTML = `
    <div style="padding:16px;background:var(--bg);flex:1;overflow-y:auto">

      <!-- Segment Switcher -->
      <div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:14px;padding-bottom:2px">
        ${segStrip}
      </div>

      <!-- Hero Banner -->
      ${heroBanners[seg] || heroBanners.general}

      <!-- Contextual location banner — scoped to the active tab -->
      ${ridePlateCategory === 'route'  ? routeCard  : ''}
      ${ridePlateCategory === 'nearby' ? nearbyCard : ''}

      <!-- Category Chips -->
      <div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:16px;padding-bottom:2px">
        ${catChips}
      </div>

      ${ridePlateCategory === 'recommended' ? `
        <!-- Featured horizontal scroll -->
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
          <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ink)">${segCfg.accentBadge} Near Your Route</div>
          <span style="font-size:12px;color:${segCfg.color};font-weight:600;cursor:pointer">See all</span>
        </div>
        <div style="display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:4px 16px 16px">
          ${pool('recommended').slice(0,6).map(m => merchantCard(m)).join('')}
        </div>
        <!-- List: all popular -->
        <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ink);margin-bottom:12px">All ${segCfg.label} Picks</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${pool('recommended').map(m => listCard(m)).join('')}
        </div>
      ` : `
        <!-- Category View -->
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
          <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ink)">${visCats.find(c=>c.id===ridePlateCategory)?.emoji||'🍽️'} ${visCats.find(c=>c.id===ridePlateCategory)?.label||'Menu'}</div>
          <span style="font-size:12px;color:${segCfg.color};font-weight:600;cursor:pointer" onclick="ridePlateCategory='recommended';renderRidePlate()">← Back</span>
        </div>
        ${current.length ? `
          <div style="display:flex;flex-direction:column;gap:10px">
            ${current.map(m => listCard(m)).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:48px 20px">
            <div style="font-size:52px;margin-bottom:12px">🍽️</div>
            <div style="font-size:15px;font-weight:700;color:var(--ink)">No items in this category</div>
            <div style="font-size:12px;color:var(--ink3);margin-top:6px">Try switching your segment or exploring another category</div>
            <div onclick="ridePlateCategory='recommended';renderRidePlate()" style="margin-top:20px;background:${segCfg.gradient};color:white;border:none;border-radius:12px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;display:inline-block">Back to Recommended</div>
          </div>
        `}
      `}

      <!-- Bottom spacer -->
      <div style="height:24px"></div>
    </div>`;
}

/* ─── Open merchant detail ──────────────────────────────────── */
function openMerchant(id) {
  const m = RP.merchants.find(x => x.id === id);
  if (!m) return;
  const segCfg = RP.segments[ridePlateSeg];

  const body = document.getElementById('shop-body');
  if (!body) return;

  body.innerHTML = `
    <div style="background:var(--bg);flex:1;overflow-y:auto">
      <!-- Hero -->
      <div style="height:180px;background:${m.bg};display:flex;align-items:center;justify-content:center;font-size:80px;position:relative">
        ${m.emoji}
        <div style="position:absolute;top:14px;left:14px;width:34px;height:34px;background:rgba(255,255,255,.88);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12)" onclick="renderRidePlate()">←</div>
        ${m.badge ? `<div style="position:absolute;top:14px;right:14px;background:${segCfg.gradient};color:white;padding:4px 11px;border-radius:100px;font-size:10px;font-weight:800">${m.badge}</div>` : ''}
      </div>
      <!-- Info -->
      <div style="padding:18px">
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:800;color:var(--ink);letter-spacing:-.5px">${m.name}</div>
        <div style="font-size:13px;color:var(--ink3);margin-top:3px">${m.tag}</div>
        <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:700"><span style="color:#F59E0B">★</span> ${m.rating} (${m.reviews.toLocaleString()} reviews)</span>
          <span style="font-size:12px;color:${segCfg.color};font-weight:700">⏱ ${m.eta}</span>
          <span style="font-size:12px;color:var(--ink3)">${m.price}</span>
        </div>
        <!-- Menu Items -->
        <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;margin:18px 0 12px">Menu</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${m.items.map(item => {
            const [name, ...rest] = item.split(' KSh ');
            const price = rest.join(' KSh ');
            return `
            <div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:13px 14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.05)">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--ink)">${name}</div>
                <div style="font-size:11px;color:var(--ink3);margin-top:2px">Fresh & prepared on order</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-family:'Playfair Display',serif;font-size:14px;font-weight:700;color:${segCfg.color}">KSh ${price}</span>
                <button onclick="addToCart('${name}',${price ? parseInt(price.replace(/,/g,'')) : 0})"
                  style="width:28px;height:28px;background:${segCfg.gradient};color:white;border:none;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <!-- Cart CTA -->
        <div id="merchant-cart-cta" style="margin-top:20px"></div>
        <div style="height:24px"></div>
      </div>
    </div>`;

  updateCartCTA(m, segCfg);
}

function updateCartCTA(m, segCfg) {
  const el = document.getElementById('merchant-cart-cta');
  if (!el) return;
  const total   = Object.values(cartItems).reduce((s,v)=>s+(v.qty||0),0);
  const totalKes = Object.values(cartItems).reduce((s,v)=>s+(v.price*(v.qty||0)),0);
  if (total > 0) {
    el.innerHTML = `
      <div style="background:${segCfg.gradient};color:white;border-radius:16px;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer" onclick="checkoutRidePlate()">
        <div><div style="font-size:14px;font-weight:800">View Cart · ${total} item${total>1?'s':''}</div><div style="font-size:11px;opacity:.8;margin-top:2px">KSh ${totalKes.toLocaleString()} · M-Pesa / Card</div></div>
        <div style="font-size:18px">🛒 →</div>
      </div>`;
  } else {
    el.innerHTML = `
      <button onclick="toast('Add items to your cart first!')" style="width:100%;background:${segCfg.gradient};color:white;border:none;border-radius:16px;padding:15px;font-size:14px;font-weight:700;cursor:pointer;opacity:.7">Add items to order →</button>`;
  }
}

function addToCart(name, price) {
  cartItems[name] = { qty: (cartItems[name]?.qty||0)+1, price: price };
  const total  = Object.values(cartItems).reduce((a,v)=>a+v.qty,0);
  const totalKES = Object.values(cartItems).reduce((a,v)=>a+(v.price*v.qty),0);
  toast(`🛒 Added! ${total} item${total>1?'s':''} · KSh ${totalKES.toLocaleString()}`);
  const cta = document.getElementById('merchant-cart-cta');
  if (cta) {
    const segCfg = RP.segments[ridePlateSeg];
    cta.innerHTML = `<div style="background:${segCfg.gradient};color:white;border-radius:16px;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer" onclick="checkoutRidePlate()"><div><div style="font-size:14px;font-weight:800">View Cart · ${total} item${total>1?'s':''}</div><div style="font-size:11px;opacity:.8;margin-top:2px">KSh ${totalKES.toLocaleString()} · M-Pesa / Card</div></div><div style="font-size:18px">🛒 →</div></div>`;
  }
}

function checkoutCart() {
  const total = Object.values(cartItems).reduce((s,v)=>s+(v.price*v.qty),0);
  if (!total) { toast('🛒 Your cart is empty'); return; }
  cartItems = {};
  toast(`✅ Order placed! KSh ${total.toLocaleString()} · Ride Plate ETA 30 min 🚗`);
  renderRidePlate();
}

function checkoutRidePlate() {
  const total = Object.values(cartItems).reduce((s,v)=>s+(v.price*(v.qty||0)),0);
  if (!total) { toast('🛒 Add items to your cart first!'); return; }
  const count = Object.values(cartItems).reduce((s,v)=>s+v.qty,0);
  cartItems = {};
  toast(`✅ Order confirmed! ${count} item${count>1?'s':''} · KSh ${total.toLocaleString()} · ETA 25–35 min 🚗`);
  renderRidePlate();
}


/* ════════════════════════════════════════════════════
   NAVIGATION — all screens
════════════════════════════════════════════════════ */
const ALL_SCREENS = ['home','explore','wishlist','inbox','profile','browse','detail','ride','shop','store','trips','themes','convo'];
const NAV_TABS    = ['home','explore','wishlist','inbox','profile'];

function goTo(s) {
  if (s === currentScreen) return;
  // Clean up ride sub-screens
  if (currentScreen === 'ride') {
    document.getElementById('tier-select-screen').classList.remove('active');
    document.getElementById('ride-confirm-screen').style.display='none';
    document.getElementById('ride-step1').style.display='block';
  }
  prevScreen = currentScreen;
  const cur = document.getElementById('screen-'+currentScreen);
  if (cur) cur.classList.remove('active');
  const nxt = document.getElementById('screen-'+s);
  if (nxt) nxt.classList.add('active');
  // Update nav bar active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // Map non-tab screens to their parent tab
  const tabMap = { browse:'explore', detail:'explore', store:'home', themes:'profile', convo:'inbox', trips:'home', ride:'home', shop:'home' };
  const activeTab = tabMap[s] || s;
  const nav = document.getElementById('nav-'+activeTab);
  if (nav) nav.classList.add('active');
  currentScreen = s;
  // Screen-specific on-enter logic
  if (s === 'shop') { ridePlateCategory='recommended'; renderRidePlate(); }
  if (s === 'wishlist') renderWishlist();
  if (s === 'explore') renderExplore();
  if (s === 'inbox') { document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); if(document.getElementById('nav-inbox')) document.getElementById('nav-inbox').classList.add('active'); }
}

function goBack() {
  const backMap = { store:'shop', themes:'profile', detail: prevScreen === 'detail' ? 'explore' : (prevScreen || 'explore'), convo:'inbox', browse:'explore' };
  goTo(backMap[currentScreen] || prevScreen || 'home');
}

/* ════ WISHLIST ════ */
let wishlist = [];

function addWishlist(id, btn) {
  const d = detailData[id] || {};
  if (wishlist.find(w=>w.id===id)) {
    wishlist = wishlist.filter(w=>w.id!==id);
    if(btn){ btn.textContent='🤍'; }
    toast('💔 Removed from wishlist');
  } else {
    wishlist.push({id, ...d});
    if(btn){ btn.textContent='❤️'; }
    // Update wishlist badge
    const badge = document.getElementById('wishlist-badge');
    if(badge){ badge.style.display='flex'; badge.textContent=wishlist.length; }
    toast('❤️ Saved to wishlist!');
  }
}

function addWishlistFromDetail() {
  const btn = document.getElementById('detail-heart');
  addWishlist(currentDetail, btn);
}

function renderWishlist() {
  const body = document.getElementById('wishlist-body');
  if(!body) return;
  const badge = document.getElementById('wishlist-badge');
  if(badge){ badge.style.display = wishlist.length ? 'flex':'none'; badge.textContent=wishlist.length; }
  if (!wishlist.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-icon">🤍</div><div class="empty-title">No saved properties</div><div class="empty-sub">Tap the heart on any listing to save it here for later.</div><button class="empty-btn" onclick="goTo('explore')">Browse Properties</button></div>`;
    return;
  }
  body.innerHTML = `
    <div style="font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:var(--ink);margin-bottom:14px">${wishlist.length} Saved Propert${wishlist.length===1?'y':'ies'}</div>
    <div class="prop-grid2">
      ${wishlist.map(w=>`
        <div class="pcard" onclick="openDetail('${w.id}')">
          <div class="pimg" style="padding:0;background:#B8D8C4;position:relative">
            <img src="${w.photo||''}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
            <div class="hbtn2" onclick="event.stopPropagation();addWishlist('${w.id}',this)">❤️</div>
          </div>
          <div class="pbody">
            <div class="pname">${w.title||'Property'}</div>
            <div class="ploc">${(w.location||'').replace('📍 ','📍 ').split('·')[0]}</div>
            <span class="pprice">${w.price||'—'}</span><span class="pperiod">/mo</span>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ════ EXPLORE / BROWSE RENDER ════ */
function renderExplore() {
  // Explore screen is static HTML, no JS render needed
  // Just ensure filter sheet works
}

/* ════ OPEN CONVERSATION ════ */
function openConversation(name, role, icon, preview, unread) {
  prevScreen = currentScreen;
  const s = document.getElementById('screen-convo');
  if(s) {
    document.getElementById('convo-name').textContent = name;
    document.getElementById('convo-role').textContent = role;
    const av = document.getElementById('convo-av');
    if(av) av.textContent = icon;
    const msgs = document.getElementById('convo-messages');
    if(msgs) msgs.innerHTML = `
      <div style="display:flex;gap:8px;justify-content:flex-start;margin-bottom:12px">
        <div style="width:32px;height:32px;background:var(--brand-faint);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${icon}</div>
        <div style="background:var(--card);border:.5px solid var(--border);border-radius:16px 16px 16px 4px;padding:10px 13px;max-width:75%;font-size:12px;color:var(--ink);line-height:1.5;box-shadow:var(--sh-xs)">${preview}</div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <div style="background:var(--brand);border-radius:16px 16px 4px 16px;padding:10px 13px;max-width:75%;font-size:12px;color:white;line-height:1.5">Hi! Thanks for letting me know. I'm ready 👍</div>
      </div>`;
  }
  document.getElementById('screen-'+currentScreen).classList.remove('active');
  document.getElementById('screen-convo').classList.add('active');
  currentScreen = 'convo';
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navInbox = document.getElementById('nav-inbox');
  if(navInbox) navInbox.classList.add('active');
}

/* ════ PROPERTY DETAIL DATA ════ */
const detailData = {
  penthouse:  {
    title:'Luxury 2-Bed Penthouse', price:'KES 180,000', location:'📍 Kilimani, Nairobi · City Views',
    img:'img-penthouse', emoji:'🏙️',
    photo:'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=85',
    beds:3, baths:2, sqm:180, rating:'4.9', reviews:233, agent:'Sarah Kamau'
  },
  villa:      {
    title:'Cliffside Villa — Ocean View', price:'KES 450,000', location:'📍 Karen, Nairobi · 5 Bedrooms',
    img:'img-villa', emoji:'🏡',
    photo:'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=85',
    beds:5, baths:4, sqm:400, rating:'4.98', reviews:98, agent:'Amina Hassan'
  },
  apt:        {
    title:'Modern 2-Bed Apartment', price:'KES 85,000', location:'📍 Westlands, Nairobi · Furnished',
    img:'img-apt', emoji:'🏢',
    photo:'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=85',
    beds:2, baths:2, sqm:95, rating:'4.7', reviews:129, agent:'Peter Mwangi'
  },
  studio:     {
    title:'Westlands Studio Loft', price:'KES 55,000', location:'📍 Westlands, Nairobi · Modern',
    img:'img-studio', emoji:'🏠',
    photo:'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=85',
    beds:1, baths:1, sqm:45, rating:'4.8', reviews:91, agent:'Sarah Kamau'
  },
  townhouse:  {
    title:'Townhouse with Garden', price:'KES 80,000', location:'📍 Karen, Nairobi · Gated Estate',
    img:'img-townhouse', emoji:'🏘️',
    photo:'https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800&q=85',
    beds:3, baths:2, sqm:180, rating:'4.8', reviews:56, agent:'Amina Hassan'
  },
  bungalow:   {
    title:'Lavington Bungalow', price:'KES 120,000', location:'📍 Lavington, Nairobi · Garden',
    img:'img-villa', emoji:'🏡',
    photo:'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=85',
    beds:4, baths:3, sqm:240, rating:'4.85', reviews:74, agent:'James Ochieng'
  },
};

/* ════ PROPERTY DETAIL ════ */
function openDetail(id) {
  currentDetail = id;
  const d = detailData[id] || detailData.penthouse;
  // Text fields
  document.getElementById('dtitle').textContent = d.title;
  document.getElementById('dprice').innerHTML   = d.price+' <span>/ month</span>';
  document.getElementById('dloc').textContent   = d.location;
  document.getElementById('bprice').textContent = d.price;
  // Rating
  const dn = document.getElementById('dstarnum');
  const dr = document.getElementById('drevs');
  if(dn) dn.textContent = d.rating||'4.9';
  if(dr) dr.textContent = ` (${d.reviews||100} reviews)`;
  // Hero image — update src of existing img
  const heroImg = document.getElementById('dhero-img');
  if(heroImg){ heroImg.src = d.photo; heroImg.alt = d.title; }
  // Spec boxes
  const specs = document.getElementById('detail-specs');
  if(specs) specs.innerHTML = `
    <div class="sbox"><div class="sicon">🛏️</div><div class="sval">${d.beds||'—'}</div><div class="slbl">Beds</div></div>
    <div class="sbox"><div class="sicon">🚿</div><div class="sval">${d.baths||'—'}</div><div class="slbl">Baths</div></div>
    <div class="sbox"><div class="sicon">📐</div><div class="sval">${d.sqm||'—'}</div><div class="slbl">Sqm</div></div>
    <div class="sbox"><div class="sicon">🚗</div><div class="sval">2</div><div class="slbl">Park</div></div>`;
  // Agent name
  const hn = document.getElementById('detail-host-name');
  if(hn) hn.textContent = (d.agent||'Sarah Kamau')+' ✓';
  // AI intelligence widgets
  renderPropertyIntel(id);
  pushRecentlyViewed(id);
  // Navigate
  prevScreen = currentScreen;
  document.getElementById('screen-'+currentScreen).classList.remove('active');
  document.getElementById('screen-detail').classList.add('active');
  currentScreen = 'detail';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const tabParent = {browse:'explore',explore:'explore',home:'home',wishlist:'wishlist',shop:'home'}[prevScreen]||'home';
  const navEl = document.getElementById('nav-'+tabParent);
  if(navEl) navEl.classList.add('active');
}

/* ════ BOOKING ════ */
function bookViewing() {
  const d = detailData[currentDetail] || detailData.penthouse;
  toast('💳 M-Pesa sent! 🚘 Driver assigned — viewing confirmed.');
  bookedTrips.push(d);
  renderTrips();
  setTimeout(() => goTo('trips'), 1800);
}
function renderTrips() {
  const c = document.getElementById('trips-list');
  if (!bookedTrips.length) {
    c.innerHTML=`<div class="empty-state"><div class="empty-icon">🗓️</div><div class="empty-title">No upcoming viewings</div><div class="empty-sub">Book a viewing to plan your perfect property tour.</div><button class="empty-btn" onclick="goTo('explore')">Browse Properties</button></div>`;
    return;
  }
  c.innerHTML=`<div style="padding:16px">${bookedTrips.map((t,i)=>`
    <div class="trip-card" style="animation-delay:${i*.05}s">
      <div class="trip-hdr"><span class="trip-status">● Confirmed</span><span class="trip-date">Today · 2:00 PM</span></div>
      <div class="trip-body2">
        <div class="trip-thumb ${t.img}">${t.emoji}</div>
        <div style="flex:1"><div class="tname">${t.title}</div><div class="tloc">${t.location}</div>
          <div class="tpr-row"><div class="tprice">${t.price}</div><span class="tier-badge tbg" style="font-size:9px">🚗 General</span><div class="taction" onclick="toast('Trip details…')">Details →</div></div>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

/* ════════════════════════════════════════════════════════
   RIDE MODE — Taxi ⟷ Delivery swipeable vehicle picker
   Custom vector iconography (crisp at any resolution,
   zero external requests, fully theme-consistent)
════════════════════════════════════════════════════════ */
const RM_ICONS = {
  ebike: `<svg viewBox="0 0 64 64" fill="none"><circle cx="16" cy="46" r="9" stroke="#fff" stroke-width="3"/><circle cx="48" cy="46" r="9" stroke="#fff" stroke-width="3"/><path d="M16 46L26 28H38M48 46L38 28M38 28L34 18H26" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 28L32 38H44" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 14H38" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="18" r="2.5" fill="#fff"/><path d="M44 38L48 46" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M14 38L8 38" stroke="#FFB020" stroke-width="3" stroke-linecap="round"/><path d="M11 34L11 42" stroke="#FFB020" stroke-width="3" stroke-linecap="round"/></svg>`,
  ev: `<svg viewBox="0 0 64 64" fill="none"><path d="M8 40C8 36 11 33 15 33H49C53 33 56 36 56 40V42C56 44.2 54.2 46 52 46H12C9.8 46 8 44.2 8 42V40Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M13 33L18 22H46L51 33" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="19" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><circle cx="45" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><path d="M30 25L25 33H31L27 40" stroke="#FFB020" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sedan: `<svg viewBox="0 0 64 64" fill="none"><path d="M6 41C6 37.5 8.5 35 12 35H52C55.5 35 58 37.5 58 41V43C58 45 56.5 46.5 54.5 46.5H9.5C7.5 46.5 6 45 6 43V41Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M12 35L17 24C18 22 20 21 22 21H42C44 21 46 22 47 24L52 35" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M21 24H43" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="17" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><circle cx="47" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><rect x="6" y="38" width="6" height="3" rx="1.5" fill="#FFB020"/></svg>`,
  matatu: `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="22" width="52" height="20" rx="4" stroke="#fff" stroke-width="3"/><path d="M6 30H58" stroke="#FFB020" stroke-width="3"/><path d="M12 22V18C12 16.9 12.9 16 14 16H50C51.1 16 52 16.9 52 18V22" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><rect x="15" y="33" width="9" height="7" rx="1.2" stroke="#fff" stroke-width="2"/><rect x="27.5" y="33" width="9" height="7" rx="1.2" stroke="#fff" stroke-width="2"/><rect x="40" y="33" width="9" height="7" rx="1.2" stroke="#fff" stroke-width="2"/><circle cx="18" cy="46" r="4.5" fill="#15171C" stroke="#fff" stroke-width="3"/><circle cx="46" cy="46" r="4.5" fill="#15171C" stroke="#fff" stroke-width="3"/></svg>`,
  parcel: `<svg viewBox="0 0 64 64" fill="none"><path d="M10 22L32 12L54 22V44L32 54L10 44V22Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M10 22L32 32L54 22" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M32 32V54" stroke="#fff" stroke-width="3"/><path d="M21 17L43 27" stroke="#FFB020" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  box: `<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="20" width="44" height="34" rx="2" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M10 30H54" stroke="#fff" stroke-width="2.5"/><path d="M28 20V54M36 20V54" stroke="#FFB020" stroke-width="2.5" stroke-dasharray="4 3"/><path d="M16 20L22 12H42L48 20" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  boot: `<svg viewBox="0 0 64 64" fill="none"><path d="M8 38C8 30 14 24 22 24H42C50 24 56 30 56 38V42C56 44.2 54.2 46 52 46H12C9.8 46 8 44.2 8 42V38Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M14 24L18 14H46L50 24" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-dasharray="3 3"/><path d="M24 46V52M40 46V52" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M20 35H44" stroke="#FFB020" stroke-width="2.5" stroke-linecap="round"/><path d="M28 31L32 35L36 31" stroke="#FFB020" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pickup: `<svg viewBox="0 0 64 64" fill="none"><path d="M4 40C4 37 6.5 35 9 35H22V25H38L48 35H55C57.5 35 59 37 59 40V43C59 44.7 57.7 46 56 46H7C5.3 46 4 44.7 4 43V40Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M22 35V25H32L40 35" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="16" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><circle cx="48" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><path d="M44 35V41H58" stroke="#FFB020" stroke-width="2.5"/></svg>`,
  truck: `<svg viewBox="0 0 64 64" fill="none"><rect x="4" y="20" width="34" height="22" rx="2" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M38 28H50L58 36V42H38V28Z" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><circle cx="48" cy="46" r="5" fill="#15171C" stroke="#fff" stroke-width="3"/><path d="M4 30H38" stroke="#FFB020" stroke-width="2.2" stroke-dasharray="3 3"/></svg>`,
  trailer: `<svg viewBox="0 0 64 64" fill="none"><rect x="2" y="22" width="14" height="18" rx="1.5" stroke="#fff" stroke-width="3"/><rect x="16" y="18" width="40" height="22" rx="1.5" stroke="#fff" stroke-width="3"/><path d="M22 18V40M30 18V40M38 18V40M46 18V40" stroke="#FFB020" stroke-width="2" stroke-dasharray="3 3"/><circle cx="9" cy="44" r="4" fill="#15171C" stroke="#fff" stroke-width="2.5"/><circle cx="38" cy="44" r="4" fill="#15171C" stroke="#fff" stroke-width="2.5"/><circle cx="48" cy="44" r="4" fill="#15171C" stroke="#fff" stroke-width="2.5"/></svg>`,
  air: `<svg viewBox="0 0 64 64" fill="none"><path d="M32 6L37 26L56 33L37 36L34 56L32 46L30 56L27 36L8 33L27 26L32 6Z" stroke="#fff" stroke-width="3" stroke-linejoin="round" fill="none"/><circle cx="32" cy="33" r="3.5" fill="#FFB020"/></svg>`,
};

const RIDE_MODES = {
  taxi: [
    { id:'ebike',  name:'E-Bike',  price:'KSh 120+', eta:'2 min',  icon:'ebike'  },
    { id:'ev',     name:'EV',      price:'KSh 480+', eta:'3 min',  icon:'ev'     },
    { id:'nissan', name:'Nissan',  price:'KSh 350+', eta:'4 min',  icon:'sedan'  },
    { id:'matatu', name:'Matatu',  price:'KSh 80+',  eta:'6 min',  icon:'matatu' },
  ],
  delivery: [
    { id:'parcel',  name:'Parcel',     price:'KSh 90+',   eta:'15 min', icon:'parcel'  },
    { id:'box',     name:'Box',        price:'KSh 150+',  eta:'18 min', icon:'box'     },
    { id:'boot',    name:'Boot Size',  price:'KSh 280+',  eta:'20 min', icon:'boot'    },
    { id:'pickup',  name:'Pick Up',    price:'KSh 650+',  eta:'25 min', icon:'pickup'  },
    { id:'truck',   name:'Truck',      price:'KSh 1,800+',eta:'40 min', icon:'truck'   },
    { id:'trailer', name:'Trailer',    price:'KSh 4,500+',eta:'1 hr',   icon:'trailer' },
    { id:'air',     name:'Air',        price:'KSh 6,200+',eta:'Same day',icon:'air'    },
  ],
};

let rideMode = 'taxi';
let rideModeSelected = { taxi:'nissan', delivery:'parcel' };

function renderRideModes() {
  const track = document.getElementById('ride-mode-track');
  if (!track) return;
  const list = RIDE_MODES[rideMode];
  const sel  = rideModeSelected[rideMode];
  track.innerHTML = list.map(m => `
    <div class="ride-mode-card${m.id===sel?' selected':''}" onclick="selectRideMode('${m.id}')">
      <span class="rmc-badge">${rideMode === 'taxi' ? 'RIDE' : 'SEND'}</span>
      <div class="rmc-stage">${RM_ICONS[m.icon]}</div>
      <div class="rmc-name">${m.name}</div>
      <div class="rmc-bottom">
        <div class="rmc-price"><b>${m.price}</b></div>
        <div class="rmc-arrow">→</div>
      </div>
    </div>
  `).join('');
}

function selectRideMode(id) {
  rideModeSelected[rideMode] = id;
  renderRideModes();
  const m = RIDE_MODES[rideMode].find(x => x.id === id);
  if (m) {
    const fd = document.getElementById('fare-display');
    if (fd) fd.textContent = m.price.replace('+','');
    toast(`${rideMode === 'taxi' ? '🚗' : '📦'} ${m.name} selected · ETA ${m.eta}`);
  }
}

function setRideMode(mode) {
  if (mode === rideMode) return;
  rideMode = mode;
  const slider = document.getElementById('rmt-slider');
  const tTab   = document.getElementById('rmt-taxi');
  const dTab   = document.getElementById('rmt-delivery');
  const icon   = document.getElementById('rmh-icon');
  const title  = document.getElementById('rmh-title');
  const sub    = document.getElementById('rmh-sub');
  const dotT   = document.getElementById('rm-dot-taxi');
  const dotD   = document.getElementById('rm-dot-delivery');
  const track  = document.getElementById('ride-mode-track');

  if (mode === 'delivery') {
    slider.classList.add('delivery');
    tTab.classList.remove('active'); dTab.classList.add('active');
    icon.textContent = '📦';
    title.textContent = 'Choose Your Delivery';
    sub.textContent = 'Select a size to begin';
    dotT.classList.remove('active'); dotD.classList.add('active');
  } else {
    slider.classList.remove('delivery');
    dTab.classList.remove('active'); tTab.classList.add('active');
    icon.textContent = '🚗';
    title.textContent = 'Choose Your Ride';
    sub.textContent = 'Select a vehicle to begin';
    dotD.classList.remove('active'); dotT.classList.add('active');
  }
  // Smooth fade-out / fade-in of the card track during transition
  if (track) {
    track.style.transition = 'opacity .16s ease';
    track.style.opacity = '0';
    setTimeout(() => { renderRideModes(); track.style.opacity = '1'; }, 160);
  }
}

/* ── Edge-swipe: scrolling past the last/first card glides into the other mode ── */
function initRideModeSwipe() {
  const track = document.getElementById('ride-mode-track');
  if (!track) return;
  let startX = 0, startScroll = 0;
  track.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startScroll = track.scrollLeft;
  }, { passive:true });
  track.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].clientX - startX;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (Math.abs(deltaX) < 55) return;
    if (deltaX < 0 && startScroll >= maxScroll - 6 && rideMode === 'taxi') {
      setRideMode('delivery');
    } else if (deltaX > 0 && startScroll <= 6 && rideMode === 'delivery') {
      setRideMode('taxi');
    }
  }, { passive:true });
}

/* ════════════════════════════════════════════════════════
   8-STEP RIDE FUNNEL ENGINE
   ENTRY → Who for → Where to → Smart Tier → Confirm/Upgrade
   → Price+ETA → Driver Assignment → Ride Execution → Rating
════════════════════════════════════════════════════════ */
let rideStep = 1;
let rideRating = 0;
let rideTags = [];

const RIDE_STEP_NAMES = {
  1:'Who is this ride for?', 2:'Where are you going?', 3:'Smart Default Tier',
  4:'Confirm or Upgrade',    5:'Pricing &amp; ETA',     6:'Finding Your Driver',
  7:'Your Ride',             8:'Rate Your Ride'
};

function goRideStep(n) {
  rideStep = n;
  document.querySelectorAll('.rstep-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('rs-'+n);
  if (panel) panel.classList.add('active');

  // Progress bar
  document.querySelectorAll('.rstep-seg').forEach(seg => {
    const segN = parseInt(seg.dataset.seg);
    seg.classList.remove('done','active');
    if (segN < n) seg.classList.add('done');
    else if (segN === n) seg.classList.add('active');
  });
  const numEl = document.getElementById('rstep-num');
  const nameEl = document.getElementById('rstep-name');
  if (numEl)  numEl.textContent  = `Step ${n} of 8`;
  if (nameEl) nameEl.innerHTML   = RIDE_STEP_NAMES[n] || '';

  // Per-step on-enter logic
  if (n === 3) renderSmartDefault();
  if (n === 4) { renderRideModes(); if (selectedTier) selectTier(selectedTier); }
  if (n === 5) populatePricing();
  if (n === 6) startDriverSearch();
  if (n === 8) { rideRating = 0; rideTags = []; document.querySelectorAll('.rate-star').forEach(s=>s.classList.remove('on')); document.querySelectorAll('.rate-tag').forEach(t=>t.classList.remove('sel')); }

  if (currentScreen !== 'ride') goTo('ride');
}

function rideStepBack() {
  if (rideStep <= 1) { goTo('home'); return; }
  if (rideStep === 6) return; // can't back out mid-search
  goRideStep(rideStep - 1);
}

/* ── Step 3: Smart Default — computed from who-for + context ── */
function computeRecommendedTier() {
  if (rideFor === 'vip')      return 'vip';
  if (rideFor === 'student')  return 'student';
  if (rideFor === 'family')   return 'general';
  if (rideFor === 'delivery') return 'general';
  return 'general';
}
function renderSmartDefault() {
  const rec = computeRecommendedTier();
  const icons = { general:'🚗', women:'🌸', student:'🎓', vip:'👑' };
  const reasons = {
    general:'Recommended for everyday trips — fast, affordable, and unlocks AI property discovery en route.',
    women:'Recommended based on your profile and time of day — verified female drivers, always private.',
    student:'Recommended for Student rides — lowest fares with a 40% discount automatically applied.',
    vip:'Recommended for VIP Guests — concierge-grade vehicle with off-market access.',
  };
  document.getElementById('rs3-icon').textContent  = icons[rec];
  document.getElementById('rs3-name').textContent  = tierNames[rec].replace(/^\S+\s/,'');
  document.getElementById('rs3-price').textContent = tierFares[rec];
  document.getElementById('rs3-why').textContent   = reasons[rec];
  selectedTier = rec;
}
function confirmSmartDefault() {
  selectTier(selectedTier);
  goRideStep(5);
}

/* ── Step 4: Confirm or Upgrade (reuses existing tier cards) ── */
function openTierSelect() { goRideStep(4); }   // legacy alias — entry points across the app
function closeTierSelect() { goRideStep(1); }
function selectTier(id) {
  selectedTier = id;
  document.querySelectorAll('.tcard').forEach(c => c.classList.remove('sel'));
  const card = document.getElementById('tc-'+id);
  if (card) card.classList.add('sel');
  const cfg = tierCfg[id];
  const btn = document.getElementById('tier-cta-btn');
  if (btn) { btn.textContent = cfg.cta; btn.className = 'rstep-btn ' + cfg.cls.replace('tier-cta-btn','').trim(); }
  const fd = document.getElementById('fare-display');
  if (fd) fd.textContent = tierFares[id];
}
function confirmTierRide() {
  if (!selectedTier) { toast('⚠️ Please select a ride tier first.'); return; }
  goRideStep(5);
}
function resetRideFlow() { goRideStep(4); } // legacy alias — "choose different tier"

/* ── Step 5: Pricing + ETA ── */
function populatePricing() {
  const id = selectedTier || 'general';
  updateFareBreakdown();
  document.getElementById('rs5-price').textContent    = tierFares[id];
  document.getElementById('rs5-tiername').textContent = tierNames[id].replace(/^\S+\s/,'');
  document.getElementById('rs5-eta').textContent       = '3 min';
}

/* ── Step 6: Driver Assignment (Priority Engine) — auto-advances ── */
function startDriverSearch() {
  clearTimeout(window._driverSearchTimer);
  window._driverSearchTimer = setTimeout(() => {
    const cfg = tierCfg[selectedTier || 'general'];
    document.getElementById('rconfirm-hero').style.background  = cfg.heroBg;
    document.getElementById('rconfirm-check').style.background = cfg.checkBg;
    document.getElementById('rconfirm-title').textContent = cfg.heading;
    document.getElementById('rconfirm-sub').textContent   = cfg.sub;
    document.getElementById('cc-tier').textContent    = tierNames[selectedTier || 'general'];
    document.getElementById('cc-driver').textContent  = cfg.driver;
    document.getElementById('cc-vehicle').textContent = cfg.vehicle;
    document.getElementById('cc-fare').textContent    = tierFares[selectedTier || 'general'];
    document.getElementById('rs8-driver').textContent = 'with ' + cfg.driver.split(' · ')[0];
    toast('✅ Driver matched — ' + cfg.driver.split(' · ')[0]);
    bookedTrips.push({title:tierNames[selectedTier||'general']+' — Kilimani Tour',price:tierFares[selectedTier||'general'],location:'📍 Kilimani → Westlands',img:'img-penthouse',emoji:'🚗'});
    renderTrips();
    goRideStep(7);
  }, 2200);
}

/* ── Step 8: Rating + behavioral tagging ── */
function setRating(n) {
  rideRating = n;
  document.querySelectorAll('.rate-star').forEach(s => {
    s.classList.toggle('on', parseInt(s.dataset.n) <= n);
  });
}
function toggleRateTag(el) {
  el.classList.toggle('sel');
  const tag = el.textContent.trim();
  rideTags = el.classList.contains('sel') ? [...rideTags, tag] : rideTags.filter(t => t !== tag);
}
function submitRideRating() {
  if (!rideRating) { toast('⚠️ Please tap a star to rate your ride.'); return; }
  toast(`✅ Thanks! ${rideRating}★ submitted${rideTags.length ? ' · tagged: ' + rideTags.join(', ') : ''}`);
  selectedTier = null;
  setTimeout(() => { goRideStep(1); goTo('trips'); }, 900);
}

/* ════ SHOP RENDER ════ */
function renderShop(tab) {
  const body = document.getElementById('shop-body');
  if (!body) return;
  if (tab === 'rideplate') { renderRidePlate(); return; }
  if (tab === 'stores') {
    body.innerHTML = `
      <div class="promo-banner" onclick="toast('🛒 Opening today\'s deals…')">
        <div class="promo-title">Shop & Ride in One Trip</div>
        <div class="promo-sub">Order groceries — get a Ride2Go to pick them up or schedule home delivery.</div>
        <button class="promo-btn" onclick="event.stopPropagation();toast('🎉 Deals loading…')">Today's Deals →</button>
      </div>
      <div class="sec-hdr"><span class="sec-title">Featured Stores</span><span class="sec-link" onclick="toast('Full list')">View all</span></div>
      <div class="sm-grid">${STORES.slice(0,4).map(s=>renderSmCard(s)).join('')}</div>
      <div class="sec-hdr"><span class="sec-title">All 12 Stores</span></div>
      <div>${STORES.map(s=>renderSmListItem(s)).join('')}</div>
      <div style="height:20px"></div>`;
  } else {
    const sectionName = SECTION_MAP[tab] || 'Fresh Produce';
    const items = INVENTORY.filter(i => i.s === sectionName);
    body.innerHTML = renderInventorySection(sectionName, items);
  }
}

function renderSmCard(s) {
  return `<div class="sm-card" onclick="openStore('${s.id}')">
    <div class="sm-logo-area" style="background:${s.bg}">
      <img src="${s.logo}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${s.name}">
      <div class="sm-logo-fb" style="display:none;color:${s.color};width:100%;align-items:center;justify-content:center;">${s.short}</div>
      <div class="sm-badge ${s.badge}">${s.status}</div>
    </div>
    <div class="sm-info">
      <div class="sm-name">${s.short}</div>
      <div class="sm-loc">📍 ${s.locs[0].split(',')[0]}</div>
      <div class="sm-row"><div class="sm-rating">★ ${s.rating}</div><div class="sm-tag">${s.tags[0]}</div></div>
    </div>
  </div>`;
}

function renderSmListItem(s) {
  return `<div style="background:var(--card);border-radius:var(--r-sm);border:.5px solid var(--border);padding:13px 14px;margin-bottom:8px;display:flex;align-items:center;gap:13px;cursor:pointer;box-shadow:var(--sh-xs)" onclick="openStore('${s.id}')">
    <div style="width:56px;height:56px;border-radius:12px;background:${s.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:6px;overflow:hidden">
      <img src="${s.logo}" onerror="this.outerHTML='<div style=\'font-size:11px;font-weight:800;color:${s.color};text-align:center\'>'+encodeURIComponent('${s.short}')+'</div>'" alt="${s.name}" style="max-width:100%;max-height:40px;object-fit:contain">
    </div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:var(--ink)">${s.name}</div>
      <div style="font-size:11px;color:var(--ink2);margin-top:2px">${s.tags.join(' · ')}</div>
      <div style="display:flex;gap:7px;margin-top:5px;flex-wrap:wrap">
        <span class="sm-badge ${s.badge}" style="position:static">${s.status}</span>
        <span style="font-size:10px;color:var(--gold)">★ ${s.rating}</span>
        <span style="font-size:10px;color:var(--ink3)">${s.hours}</span>
      </div>
    </div>
    <div style="font-size:16px;color:var(--ink3)">›</div>
  </div>`;
}

function renderInventorySection(sectionName, items) {
  const icon = SECTION_ICONS[sectionName] || '🛒';
  return `<div class="inv-section">
    <div class="inv-sec-hdr">
      <span class="inv-sec-icon">${icon}</span>
      <span class="inv-sec-name">${sectionName}</span>
      <span class="inv-sec-count">${items.length} items</span>
    </div>
    <div class="inv-grid">
      ${items.map(item => `
        <div class="inv-item" onclick="toast('🛒 Added ${item.n} to cart')">
          <div class="inv-item-icon">${item.i}</div>
          <div style="flex:1"><div class="inv-item-name">${item.n}</div><div class="inv-item-cat">${item.c}</div></div>
          <span class="inv-item-pri pri-${item.p === 'high' ? 'high' : item.p === 'medium' ? 'med' : 'low'}">${item.p}</span>
          <button class="inv-add-btn" onclick="event.stopPropagation();toast('✅ ${item.i} Added!')">+</button>
        </div>`).join('')}
    </div>
  </div><div style="height:20px"></div>`;
}

function setShopTab(el, tab) {
  document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'rideplate') {
    ridePlateCategory = 'recommended';
    renderRidePlate();
  } else {
    renderShop(tab);
  }
}

/* ════ STORE DETAIL ════ */
function openStore(id) {
  const s = STORES.find(x => x.id === id);
  if (!s) return;
  prevScreen = currentScreen;
  document.getElementById('store-hero').style.background = s.bg;
  const img = document.getElementById('store-logo');
  img.src = s.logo; img.alt = s.name;
  document.getElementById('store-name').textContent = s.name;
  document.getElementById('store-meta').innerHTML = `
    <span class="store-pill">${s.status} · ${s.hours}</span>
    <span class="store-pill" style="color:var(--gold)">★ ${s.rating}</span>
    ${s.tags.map(t=>`<span class="store-pill">${t}</span>`).join('')}`;
  document.getElementById('store-locations').innerHTML = s.locs.map((loc,i) => `
    <div class="slitem" onclick="goTo('ride');toast('🚗 Ride2Go to ${s.short}!')">
      <div class="slitem-icon">🏪</div>
      <div><div class="slitem-name">${loc}</div><div class="slitem-dist">${(0.8+i*1.4).toFixed(1)} km away · Open Now</div></div>
      <div class="slitem-arr">›</div>
    </div>`).join('');
  document.getElementById('screen-'+currentScreen).classList.remove('active');
  document.getElementById('screen-store').classList.add('active');
  currentScreen = 'store';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeTab = {shop:'home',home:'home',explore:'explore'}[prevScreen] || 'home';
  const navEl2 = document.getElementById('nav-'+activeTab);
  if(navEl2) navEl2.classList.add('active');
}

/* ════ PROFILE ════ */
function openAgentModal() { document.getElementById('agent-modal').classList.add('open'); }
function activateAgent() {
  const btn = document.getElementById('upgrade-btn-main');
  btn.textContent = '⏳ Activating Agent Mode…';
  btn.disabled = true; btn.style.opacity = '.7';
  setTimeout(() => {
    isAgent = true;
    document.getElementById('agent-modal').classList.remove('open');
    renderProfile();
    toast('🎉 You\'re now a Verified Agent!');
  }, 1600);
}
function renderProfile() {
  const slot = document.getElementById('agent-banner-slot');
  if (isAgent) {
    document.getElementById('pav').textContent = '👩‍💼';
    document.getElementById('prof-stat2').textContent = '24';
    document.getElementById('prof-stat2-lbl').textContent = 'Listings';
    slot.innerHTML = `<div class="agent-banner-on"><div class="aab-dot"></div><div><div class="aab-text">Agent Mode Active ✦</div><div class="aab-sub">Verified · Managing your properties</div></div></div>`;
  } else {
    document.getElementById('pav').textContent = '👤';
    slot.innerHTML = `<div class="agent-banner-up" onclick="openAgentModal()"><div class="aub-icon">🏠</div><div class="aub-text"><div class="aub-title">Become an Agent</div><div class="aub-sub">List properties · Connect with clients</div></div><div class="aub-arr">›</div></div>`;
  }
  const agentSec = isAgent ? `
    <div class="psec"><span class="psec-lbl">Agent Tools</span><div class="mgroup">
      <div class="mitem" onclick="toast('My Listings…')"><div class="micon" style="background:#F0FFF4">🏠</div><div class="mtext"><div class="mtitle">My Listings</div><div class="msub">Manage your properties</div></div><span class="marrow">›</span></div>
      <div class="mitem" onclick="toast('Viewing Requests…')"><div class="micon" style="background:#E8F4FF">📅</div><div class="mtext"><div class="mtitle">Viewing Requests</div><div class="msub">Confirm or reschedule</div></div><span class="marrow">›</span></div>
    </div></div>` : `
    <div class="psec"><span class="psec-lbl">For Agents</span><div class="mgroup">
      <div class="mitem" onclick="openAgentModal()"><div class="micon" style="background:#F0EDFF">✦</div><div class="mtext"><div class="mtitle" style="color:#5856D6">Become an Agent</div><div class="msub">List properties on Ride2View</div></div><span class="marrow" style="color:#5856D6">›</span></div>
    </div></div>`;
  document.getElementById('profile-menu').innerHTML = `
    <div class="psec"><span class="psec-lbl">Account</span><div class="mgroup">
      <div class="mitem" onclick="toast('Bookings…')"><div class="micon" style="background:var(--brand-faint)">📋</div><div class="mtext"><div class="mtitle">My Bookings</div><div class="msub">Upcoming & past viewings</div></div><span class="mbadge">2</span><span class="marrow">›</span></div>
      <div class="mitem" onclick="toast('Saved…')"><div class="micon" style="background:#FFF0F2">❤️</div><div class="mtext"><div class="mtitle">Saved Properties</div><div class="msub">3 properties saved</div></div><span class="marrow">›</span></div>
      <div class="mitem" onclick="toast('Payments…')"><div class="micon" style="background:#F0FFF4">💳</div><div class="mtext"><div class="mtitle">Payment Methods</div><div class="msub">M-Pesa · Visa ···4242</div></div><span class="marrow">›</span></div>
    </div></div>
    <div class="psec"><span class="psec-lbl">Ride Tiers</span><div class="mgroup">
      <div class="mitem" onclick="goTo('ride');setTimeout(openTierSelect,300)">
        <div class="micon" style="background:var(--tier-v-bg)">👑</div>
        <div class="mtext"><div class="mtitle">My Ride Tier</div><div class="msub">Current: General Ride · Switch tier</div></div>
        <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
          <span class="tier-badge tbg" style="font-size:8px">🚗</span>
          <span class="tier-badge tbv" style="font-size:8px">👑</span>
        </div>
      </div>
      <div class="mitem" onclick="toast('Ride History…')"><div class="micon" style="background:#EEF4FF">🚗</div><div class="mtext"><div class="mtitle">Ride History</div><div class="msub">24 completed rides</div></div><span class="marrow">›</span></div>
    </div></div>
    <div class="psec"><span class="psec-lbl">Shop</span><div class="mgroup">
      <div class="mitem" onclick="goTo('shop')"><div class="micon" style="background:#FFF5EE">🛒</div><div class="mtext"><div class="mtitle">Shop & Ride</div><div class="msub">Naivas · Carrefour · Quickmart & more</div></div><span class="marrow">›</span></div>
    </div></div>
    ${agentSec}
    <div class="psec"><span class="psec-lbl">Appearance</span><div class="mgroup">
      <div class="mitem" onclick="goTo('themes')">
        <div class="micon" style="background:var(--brand-faint)">🎨</div>
        <div class="mtext"><div class="mtitle">App Theme</div><div class="msub">Currently: ${THEME_CONFIG.themes[currentTheme].label}</div></div>
        <span class="marrow">›</span>
      </div>
    </div></div>
    <div class="psec"><span class="psec-lbl">Support</span><div class="mgroup">
      <div class="mitem" onclick="openVoiceArchScreen()"><div class="micon" style="background:#F0EDFF">🎤</div><div class="mtext"><div class="mtitle">Voice Intelligence</div><div class="msub">5-layer voice system · Architecture docs</div></div><span class="marrow">›</span></div>
        <div class="mitem" onclick="toast('Help Centre…')"><div class="micon" style="background:#FFF8F0">🆘</div><div class="mtext"><div class="mtitle">Help Centre</div><div class="msub">FAQs, support, contact us</div></div><span class="marrow">›</span></div>
      <div class="mitem" onclick="toast('Signing out…')"><div class="micon" style="background:#FFF0F0">🚪</div><div class="mtext"><div class="mtitle" style="color:var(--red)">Sign Out</div><div class="msub">See you next time 👋</div></div><span class="marrow">›</span></div>
    </div></div>
    <div style="height:16px"></div>`;
}

/* ════ TOAST ════ */
function toast(msg) {
  // Preview feedback must not overlay the signed-in production workspace.
  if (document.getElementById('app-workspace')?.hidden === false) return;
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ════ TAB / CHIP HELPERS ════ */
function setChip(el) {
  const p = el.closest('.chips') || el.parentElement;
  p.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}
function setSTab(el) {
  const p = el.closest('.sug-tabs') || el.parentElement;
  p.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  toast('✦ Showing ' + el.textContent.trim() + ' suggestions');
}
function toggleBed(el) {
  const p = el.closest('.fbtns') || el.parentElement;
  p.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}
function setShopCatTab(el, tab) {
  const p = el.closest('.shop-tabs') || el.parentElement;
  p.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderShop(tab);
}

/* ════ MODAL HELPERS ════ */
function openModal(id)  { const el=document.getElementById(id); if(el){el.classList.add('open');el.style.display='flex';} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('open');} }
function openAgentModal()  { openModal('agent-modal'); }
function closeAgentModal() { closeModal('agent-modal'); }

/* ════ FILTER SHEET ════ */
function openFilters()  { const fs=document.getElementById('fsheet-bg'); if(fs) fs.style.display='block'; }
function closeFilters(e){ const fs=document.getElementById('fsheet-bg'); if(fs&&e.target===fs) fs.style.display='none'; }
function applyFilters() { const fs=document.getElementById('fsheet-bg'); if(fs) fs.style.display='none'; toast('✅ Filters applied'); }

/* ════ SEND MESSAGE ════ */
function sendMessage() {
  const input = document.getElementById('convo-input');
  if (!input || !input.value.trim()) return;
  const msgs = document.getElementById('convo-messages');
  if (!msgs) return;
  const text = input.value.trim(); input.value = '';
  const out = document.createElement('div');
  out.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px';
  const bubble = document.createElement('div');
  bubble.style.cssText = 'background:var(--brand);border-radius:16px;padding:10px 14px;max-width:78%;font-size:13px;color:#fff';
  bubble.textContent = text;
  out.appendChild(bubble);
  msgs.appendChild(out); msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    const av = document.getElementById('convo-av');
    const reply = document.createElement('div');
    reply.style.cssText = 'display:flex;gap:8px;margin-bottom:10px';
    reply.innerHTML = `<div style="width:30px;height:30px;background:var(--brand-faint);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">👩</div><div style="background:var(--card);border:.5px solid var(--border);border-radius:16px 16px 16px 4px;padding:10px 14px;max-width:78%;font-size:13px;color:var(--ink);line-height:1.5">Preview conversation only. No message has been sent.</div>`;
    msgs.appendChild(reply); msgs.scrollTop = msgs.scrollHeight;
  }, 1200);
}


// One voice controller belongs to the connected workspace.
function toggleVoice(){window.R2V.openVoice();}
function openVoiceFAB(){window.R2V.openVoice();}
function voiceOpen(){window.R2V.openVoice();}
(function init() {
  // 1. Apply saved theme
  applyTheme(currentTheme);

  // 2. Force home screen active (avoid goTo guard issue)
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const homeEl = document.getElementById('screen-home');
  const navHome = document.getElementById('nav-home');
  if (homeEl) homeEl.classList.add('active');
  if (navHome) navHome.classList.add('active');
  currentScreen = 'home';
  prevScreen    = 'home';

  // 3. Render dynamic screens
  renderProfile();
  renderRidePlate(); // Default: show Ride Plate on shop load
  updateFareBreakdown(); // Initialise fare transparency panel

  // 3b. Voice Intelligence System boot
  if (typeof addVoiceCSS === 'function') addVoiceCSS();
  if (typeof VIS !== 'undefined' && VIS.initRecognition) {
    try { VIS.initRecognition(); } catch(e) { console.warn('VIS init:', e.message); }
  }

  // 4. Theme JSON display
  const cfg0 = THEME_CONFIG.themes[currentTheme];
  const jd   = document.getElementById('theme-json-display');
  if (jd) jd.textContent = JSON.stringify({ theme: currentTheme, wcag: cfg0.wcag, brand: cfg0.brand, accent: cfg0.light, bg: cfg0.bg, darkMode: cfg0.dark }, null, 2);

  // 5. Init Voice Intelligence System
  if (typeof VIS !== 'undefined' && VIS.init) VIS.init();

  // 6. Live clock
  function tickClock() {
    const el = document.getElementById('sb-time');
    if (!el) return;
    const n = new Date();
    el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }
  tickClock();
  setInterval(tickClock, 30000);
})();


// The preview never processes transactions. Use the connected booking workspace.
function openConnectedWorkspace() { document.getElementById('app-workspace').hidden=false; }
bookViewing = openConnectedWorkspace;
checkoutCart = openConnectedWorkspace;
checkoutRidePlate = openConnectedWorkspace;
bookLater = openConnectedWorkspace;
confirmTierRide = openConnectedWorkspace;
startDriverSearch = openConnectedWorkspace;
confirmArrived = openConnectedWorkspace;
