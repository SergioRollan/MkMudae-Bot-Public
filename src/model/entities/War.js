export class War {
  constructor(id, challengerId, challengedId, date, result, betMoney, type) {
    this.id = id;
    this.challengerId = challengerId;
    this.challengedId = challengedId;
    this.date = date;
    this.result = result;
    this.betMoney = betMoney;
    this.type = type;
  }
}
