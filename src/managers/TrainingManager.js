class TrainingManager {
  static getTrainings() {
    return {
      1: {
        effects: {
          Mental: "+++",
          Consistency: "+",
          ItemUsage: "-",
        },
      },
      2: {
        effects: {
          Lines: "+++",
          Consistency: "+",
          GameSense: "-",
        },
      },
      3: {
        effects: {
          ItemUsage: "++",
          GameSense: "++",
          Consistency: "+",
          Mental: "-",
          Communication: "-",
        },
      },
      4: {
        effects: {
          Consistency: "++",
          Lines: "+",
          Mental: "+",
          Shockfinding: "-",
        },
      },
      5: {
        effects: {
          Communication: "++",
          Precision: "+",
          Lines: "+",
          Shockfinding: "+",
          Consistency: "-",
        },
      },
      6: {
        effects: {
          Precision: "+++",
          GameSense: "+",
          Lines: "-",
        },
      },
      7: {
        effects: {
          Shockfinding: "++",
          Communication: "+",
          ItemUsage: "+",
          Precision: "-",
        },
      },
      8: {
        focus: true,
      },
    };
  }

  static getTraining(id) {
    const trainings = this.getTrainings();
    return trainings[id] || null;
  }

  static rollDelta(symbol) {
    if (symbol === "+++") {
      return TrainingManager.randomInt(23, 30);
    }
    if (symbol === "++") {
      return TrainingManager.randomInt(16, 22);
    }
    if (symbol === "+") {
      return TrainingManager.randomInt(10, 15);
    }
    if (symbol === "-") {
      return -TrainingManager.randomInt(3, 7);
    }
    return 0;
  }

  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = TrainingManager;
