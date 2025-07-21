// Simple sentiment analysis service
class SentimentService {
  constructor() {
    // Positive and negative word lists (simplified)
    this.positiveWords = [
      "love",
      "like",
      "amazing",
      "awesome",
      "great",
      "wonderful",
      "fantastic",
      "excellent",
      "good",
      "nice",
      "beautiful",
      "happy",
      "excited",
      "fun",
    ]

    this.negativeWords = [
      "hate",
      "dislike",
      "terrible",
      "awful",
      "bad",
      "horrible",
      "disgusting",
      "annoying",
      "stupid",
      "ugly",
      "sad",
      "angry",
      "frustrated",
      "boring",
    ]
  }

  analyzeSentiment(text) {
    if (!text) return 0

    const words = text.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    words.forEach((word) => {
      if (this.positiveWords.includes(word)) {
        positiveCount++
      } else if (this.negativeWords.includes(word)) {
        negativeCount++
      }
    })

    const totalWords = words.length
    const sentiment = (positiveCount - negativeCount) / totalWords

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, sentiment))
  }

  isInappropriate(text) {
    const inappropriateWords = ["spam", "scam", "fake", "bot", "money", "bitcoin", "investment"]

    const lowerText = text.toLowerCase()
    return inappropriateWords.some((word) => lowerText.includes(word))
  }
}

module.exports = new SentimentService()
