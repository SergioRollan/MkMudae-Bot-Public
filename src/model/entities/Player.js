export class Player {
  constructor(
    id,
    alias,
    name,
    mmr,
    peakMmr,
    events,
    lines,
    consistency,
    itemUsage,
    precision,
    communication,
    mental,
    gameSense,
    shockFinding
  ) {
    this.id = id;
    this.alias = alias;
    this.name = name;
    this.mmr = mmr;
    this.peakMmr = peakMmr;
    this.events = events;
    this.lines = lines;
    this.consistency = consistency;
    this.itemUsage = itemUsage;
    this.precision = precision;
    this.communication = communication;
    this.mental = mental;
    this.gameSense = gameSense;
    this.shockFinding = shockFinding;
  }
}
