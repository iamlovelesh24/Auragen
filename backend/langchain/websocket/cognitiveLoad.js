class CognitiveLoadCalculator {
  constructor(windowMs = 5000, threshold = 7.0) {
    this.windowMs = windowMs;
    this.threshold = threshold;
    this.events = [];
  }

  addEvent(event) {
    const now = Date.now();
    this.events.push({ ...event, timestamp: now });
    this.cleanup(now);
  }

  cleanup(now) {
    const cutoff = now - this.windowMs;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
  }

  calculateScore() {
    this.cleanup(Date.now());
    
    let score = 0;
    this.events.forEach(e => {
      if (e.type === 'hesitation') score += (e.durationMs / 1000) * 2;
      if (e.type === 'backspace') score += 1.5;
      if (e.type === 'rapid_click') score += 2.0;
      if (e.type === 'mouse_jitter') score += 1.0;
    });

    return parseFloat(score.toFixed(2));
  }

  isOverloaded() {
    return this.calculateScore() >= this.threshold;
  }

  reset() {
    this.events = [];
    return { status: 'cleared', eventCount: 0 };
  }
}

module.exports = CognitiveLoadCalculator;