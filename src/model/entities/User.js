export class User {
  constructor(
    userId,
    discordId,
    discordServerId,
    name,
    coins,
    elo,
    lastLineup,
    trainingsLeft,
    rollsLeft,
    canClaim,
    teamName,
    trackBalancedA,
    trackBalancedB,
    trackTopA,
    trackTopB,
    trackRemoveTopA,
    trackRemoveTopB,
    trackBottomA,
    trackBottomB
  ) {
    this.userId = userId;
    this.discordId = discordId;
    this.discordServerId = discordServerId;
    this.name = name;
    this.coins = coins;
    this.elo = elo;
    this.lastLineup = lastLineup;
    this.trainingsLeft = trainingsLeft;
    this.rollsLeft = rollsLeft;
    this.canClaim = canClaim;
    this.teamName = teamName;
    this.trackBalancedA = trackBalancedA;
    this.trackBalancedB = trackBalancedB;
    this.trackTopA = trackTopA;
    this.trackTopB = trackTopB;
    this.trackRemoveTopA = trackRemoveTopA;
    this.trackRemoveTopB = trackRemoveTopB;
    this.trackBottomA = trackBottomA;
    this.trackBottomB = trackBottomB;
  }
}
