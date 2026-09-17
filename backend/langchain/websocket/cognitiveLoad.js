/**
 * Cognitive Load Calculator
 * Computes user overload metrics using a sliding window strategy.
 */
class CognitiveLoadCalculator {
  constructor(windowSizeMs = 5000, threshold = 0.75) {
    this.windowSizeMs = windowSizeMs;
    this.threshold = threshold;
    this.events = [];
  }

  // Record an incoming telemetry event
  addEvent(event) {
    const now = Date.now();
    this.events.push({ ...event, timestamp: now });
    this.cleanOldEvents(now);
  }

  // Remove events outside the sliding window
  cleanOldEvents(currentTime) {
    const cutoff = currentTime - this.windowSizeMs;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
  }

  // Calculate normalized cognitive load score (0.0 to 1.0)
  calculateScore() {
    if (this.events.length === 0) return 0;

    let totalWeight = 0;
    this.events.forEach(e => {
      if (e.type === 'hesitation') totalWeight += 0.4;
      if (e.type === 'click') totalWeight += 0.2;
      if (e.type === 'mouse_move' && e.velocity > 1.5) totalWeight += 0.1;
    });

    const score = Math.min(totalWeight, 1.0);
    return parseFloat(score.toFixed(2));
  }

  // Check if score exceeds high-load trigger threshold
  isOverloaded() {
    return this.calculateScore() >= this.threshold;
  }
}

module.exports = CognitiveLoadCalculator;