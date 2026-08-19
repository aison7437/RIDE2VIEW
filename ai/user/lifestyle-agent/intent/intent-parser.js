/**
 * RIDE2VIEW Lifestyle Agent
 * Intent Parser
 *
 * Converts natural-language requests into structured,
 * normalized intent.
 */

const {
  GOALS,
  USER_SEGMENTS,
  MOBILITY_SEGMENTS,
  PRIORITIES
} = require("./intent-types");

const {
  normalizeText,
  normalizeIntent
} = require("./intent-normalizer");

function detectGoal(text) {
  if (
    /\b(property|house|home|apartment|flat|villa|mansion|bungalow|rent|rental|buy|buying|real estate|accommodation|housing)\b/.test(
      text
    )
  ) {
    return GOALS.PROPERTY;
  }

  if (
    /\b(ride|taxi|transport|transportation|driver|pickup|pick up|drop off|travel|get me there)\b/.test(
      text
    )
  ) {
    return GOALS.MOBILITY;
  }

  if (
    /\b(food|restaurant|meal|lunch|dinner|breakfast|delivery|eat)\b/.test(
      text
    )
  ) {
    return GOALS.FOOD;
  }

  if (
    /\b(event|venue|party|wedding|conference|meeting)\b/.test(
      text
    )
  ) {
    return GOALS.EVENT;
  }

  if (
    /\b(hotel|short stay|short-stay|airbnb|stay tonight|accommodation for a night)\b/.test(
      text
    )
  ) {
    return GOALS.SHORT_STAY;
  }

  if (
    /\b(shop|shopping|marketplace|buy product|product)\b/.test(
      text
    )
  ) {
    return GOALS.MARKETPLACE;
  }

  return GOALS.GENERAL;
}

function detectLocation(text) {
  const knownCities = [
    "nairobi",
    "mombasa",
    "kisumu",
    "nakuru",
    "eldoret",
    "kampala",
    "dar es salaam",
    "johannesburg",
    "cairo"
  ];

  const knownAreas = [
    "westlands",
    "kilimani",
    "lavington",
    "karen",
    "kileleshwa",
    "parklands",
    "runda",
    "kasarani",
    "langata",
    "south b",
    "south c",
    "ruaka",
    "kileleshwa"
  ];

  let city = null;
  let area = null;

  for (const candidate of knownCities) {
    if (text.includes(candidate)) {
      city = candidate
        .split(" ")
        .map(
          word =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");

      break;
    }
  }

  for (const candidate of knownAreas) {
    if (text.includes(candidate)) {
      area = candidate
        .split(" ")
        .map(
          word =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");

      break;
    }
  }

  return {
    city,
    area,
    country: city ? "Kenya" : null
  };
}

function detectBedrooms(text) {
  const patterns = [
    /\b(\d+)\s*[- ]?\s*bedroom\b/,
    /\b(\d+)\s*br\b/,
    /\b(\d+)\s*bed\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  if (/\bone bedroom\b/.test(text)) {
    return 1;
  }

  if (/\btwo bedroom\b/.test(text)) {
    return 2;
  }

  if (/\bthree bedroom\b/.test(text)) {
    return 3;
  }

  if (/\bfour bedroom\b/.test(text)) {
    return 4;
  }

  return null;
}

function detectBudget(text) {
  /*
   * Supports examples such as:
   *
   * KSh 50,000
   * KES 50000
   * 50000 shillings
   * under 50k
   * below 50000
   * max 50k
   */

  const currencyPattern =
    /(?:ksh|kes|kshs)\s*([\d,]+(?:\.\d+)?)\b/i;

  const currencyMatch = text.match(currencyPattern);

  if (currencyMatch) {
    const amount = Number(
      currencyMatch[1].replace(/,/g, "")
    );

    return {
      minimum: null,
      maximum: amount,
      preferred: amount,
      type: "maximum"
    };
  }

  const thousandPattern =
    /\b(?:under|below|less than|max(?:imum)?|up to|within)\s*(?:ksh|kes)?\s*([\d,.]+)\s*k\b/i;

  const thousandMatch = text.match(
    thousandPattern
  );

  if (thousandMatch) {
    const amount =
      Number(
        thousandMatch[1].replace(/,/g, "")
      ) * 1000;

    return {
      minimum: null,
      maximum: amount,
      preferred: amount,
      type: "maximum"
    };
  }

  const numberPattern =
    /\b(?:under|below|less than|max(?:imum)?|up to|within)\s*(?:ksh|kes)?\s*([\d,]+)\b/i;

  const numberMatch = text.match(numberPattern);

  if (numberMatch) {
    const amount = Number(
      numberMatch[1].replace(/,/g, "")
    );

    return {
      minimum: null,
      maximum: amount,
      preferred: amount,
      type: "maximum"
    };
  }

  /*
   * "for KSh 30,000"
   */

  const forPattern =
    /\bfor\s*(?:ksh|kes)\s*([\d,]+)\b/i;

  const forMatch = text.match(forPattern);

  if (forMatch) {
    const amount = Number(
      forMatch[1].replace(/,/g, "")
    );

    return {
      minimum: null,
      maximum: amount,
      preferred: amount,
      type: "maximum"
    };
  }

  return {
    minimum: null,
    maximum: null,
    preferred: null,
    type: null
  };
}

function detectUserSegment(text) {
  if (
    /\b(women[- ]only|female[- ]only|women|female|ladies|lady)\b/.test(
      text
    )
  ) {
    return USER_SEGMENTS.WOMEN_ONLY;
  }

  if (
    /\b(student|students|campus|university|college|hostel)\b/.test(
      text
    )
  ) {
    return USER_SEGMENTS.STUDENT;
  }

  if (
    /\b(vip|luxury|premium|exclusive|high[- ]end)\b/.test(
      text
    )
  ) {
    return USER_SEGMENTS.VIP;
  }

  return USER_SEGMENTS.GENERAL;
}

function detectMobility(text) {
  const required =
    /\b(ride|taxi|transport|transportation|driver|pickup|pick up|drop off|get me there|take me there|travel there)\b/.test(
      text
    );

  let segment = MOBILITY_SEGMENTS.GENERAL;

  if (
    /\b(women[- ]only|female[- ]only|women|female|ladies)\b/.test(
      text
    )
  ) {
    segment = MOBILITY_SEGMENTS.WOMEN_ONLY;
  } else if (
    /\b(student|students|campus)\b/.test(text)
  ) {
    segment = MOBILITY_SEGMENTS.STUDENT;
  } else if (
    /\b(vip|luxury|premium|executive)\b/.test(text)
  ) {
    segment = MOBILITY_SEGMENTS.VIP;
  }

  return {
    required,
    segment,
    service: required ? "ride" : null,
    destination: null
  };
}

function detectPreferences(text) {
  const preferences = [];

  if (
    /\b(affordable|cheap|cheapest|budget|low cost|economical)\b/.test(
      text
    )
  ) {
    preferences.push("affordable");
  }

  if (
    /\b(convenient|convenience|easy|comfortable)\b/.test(
      text
    )
  ) {
    preferences.push("convenience");
  }

  if (
    /\b(premium|luxury|exclusive|high[- ]end)\b/.test(
      text
    )
  ) {
    preferences.push("premium");
  }

  if (
    /\b(fast|quick|urgent|immediately|within one hour)\b/.test(
      text
    )
  ) {
    preferences.push("fast");
  }

  if (
    /\b(furnished|fully furnished)\b/.test(
      text
    )
  ) {
    preferences.push("furnished");
  }

  return preferences;
}

function detectAvailableTime(text) {
  if (
    /\b(one hour|1 hour|within an hour)\b/.test(
      text
    )
  ) {
    return "1 hour";
  }

  if (
    /\b(two hours|2 hours)\b/.test(text)
  ) {
    return "2 hours";
  }

  if (
    /\b(three hours|3 hours)\b/.test(text)
  ) {
    return "3 hours";
  }

  if (/\btoday\b/.test(text)) {
    return "today";
  }

  if (/\btonight\b/.test(text)) {
    return "tonight";
  }

  return null;
}

function detectPropertyType(text) {
  if (/\b(villa|villas)\b/.test(text)) {
    return "villa";
  }

  if (/\bmansion\b/.test(text)) {
    return "mansion";
  }

  if (/\bbungalow\b/.test(text)) {
    return "bungalow";
  }

  if (
    /\b(apartment|apartments|flat|flats)\b/.test(
      text
    )
  ) {
    return "apartment";
  }

  if (
    /\b(hostel|student accommodation)\b/.test(
      text
    )
  ) {
    return "student-accommodation";
  }

  return null;
}

function detectPremium(text) {
  return /\b(premium|luxury|exclusive|high[- ]end|executive)\b/.test(
    text
  );
}

function detectStudent(text) {
  return /\b(student|students|campus|university|college|hostel|student accommodation)\b/.test(
    text
  );
}

function detectPriorities({
  goal,
  bedrooms,
  location,
  budget,
  mobility,
  userSegment,
  preferences
}) {
  const priorities = [];

  if (goal !== GOALS.GENERAL) {
    priorities.push(PRIORITIES.GOAL);
  }

  if (location.city || location.area) {
    priorities.push(PRIORITIES.LOCATION);
  }

  if (bedrooms !== null) {
    priorities.push(PRIORITIES.BEDROOMS);
  }

  if (budget.maximum !== null) {
    priorities.push(PRIORITIES.BUDGET);
  }

  if (mobility.required) {
    priorities.push(PRIORITIES.MOBILITY);
  }

  if (userSegment === USER_SEGMENTS.STUDENT) {
    priorities.push(PRIORITIES.STUDENT);
  }

  if (
    userSegment === USER_SEGMENTS.WOMEN_ONLY
  ) {
    priorities.push(PRIORITIES.WOMEN_ONLY);
  }

  if (userSegment === USER_SEGMENTS.VIP) {
    priorities.push(PRIORITIES.PREMIUM);
  }

  if (preferences.includes("affordable")) {
    priorities.push(PRIORITIES.VALUE);
  }

  if (preferences.includes("convenience")) {
    priorities.push(PRIORITIES.CONVENIENCE);
  }

  return [
    ...new Set(priorities)
  ];
}

function parseIntent(request = {}) {
  const message =
    typeof request === "string"
      ? request
      : request.message || "";

  const text = normalizeText(message);

  const goal = detectGoal(text);
  const location = detectLocation(text);
  const bedrooms = detectBedrooms(text);
  const budget = detectBudget(text);
  const userSegment = detectUserSegment(text);
  const mobility = detectMobility(text);
  const preferences = detectPreferences(text);
  const availableTime = detectAvailableTime(text);
  const propertyType = detectPropertyType(text);
  const premium = detectPremium(text);
  const student = detectStudent(text);

  const priorities = detectPriorities({
    goal,
    bedrooms,
    location,
    budget,
    mobility,
    userSegment,
    preferences
  });

  const rawIntent = {
    goal,

    location,

    budget,

    property: {
      propertyType,
      bedrooms,
      bathrooms: null,
      furnished: preferences.includes("furnished"),
      premium,
      studentFriendly: student
    },

    mobility,

    userSegment,

    availableTime,

    preferences,

    priorities,

    constraints: {
      hard: [],
      soft: []
    }
  };

  return normalizeIntent(rawIntent);
}

function parseRequest(request = {}) {
  return parseIntent(request);
}

module.exports = {
  parseIntent,
  parseRequest,
  detectGoal,
  detectLocation,
  detectBedrooms,
  detectBudget,
  detectUserSegment,
  detectMobility,
  detectPreferences,
  detectAvailableTime,
  detectPropertyType,
  detectPremium,
  detectStudent,
  detectPriorities
};
