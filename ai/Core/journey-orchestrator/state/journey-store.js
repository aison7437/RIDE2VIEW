class InMemoryJourneyStore {
  constructor(){this.items=new Map();}
  async save(journey){this.items.set(journey.journey_id,structuredClone(journey));return journey;}
  async get(id){const value=this.items.get(id);return value?structuredClone(value):null;}
}
module.exports={InMemoryJourneyStore};