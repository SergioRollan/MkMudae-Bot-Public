export class BaseStats {
  constructor(
    loungeId,
    lines,
    consistency,
    itemUsage,
    precision,
    communication,
    mental,
    gameSense,
    shockFinding
  ) {
    this.loungeId = loungeId;
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
