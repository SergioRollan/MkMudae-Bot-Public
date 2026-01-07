export class Rank {
  constructor(id, name, elo, pulls, training, discount, wishlist, maxRoster) {
    this.id = id;
    this.name = name;
    this.elo = elo;
    this.pulls = pulls;
    this.training = training;
    this.discount = discount;
    this.wishlist = wishlist;
    this.maxRoster = maxRoster;
  }
}
