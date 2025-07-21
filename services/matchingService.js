// AI-powered matching service
const Profile = require("../models/Profile") // Import Profile model

class MatchingService {
  // Calculate compatibility between two profiles
  async calculateCompatibility(profile1, profile2) {
    let score = 0
    let totalWeight = 0

    // Age compatibility (weight: 20%)
    const ageWeight = 20
    const ageDiff = Math.abs(profile1.age - profile2.age)
    const ageScore = Math.max(0, 100 - ageDiff * 5) // Decrease by 5 points per year difference
    score += (ageScore * ageWeight) / 100
    totalWeight += ageWeight

    // Location compatibility (weight: 25%)
    if (profile1.location?.coordinates && profile2.location?.coordinates) {
      const locationWeight = 25
      const distance = this.calculateDistance(profile1.location.coordinates, profile2.location.coordinates)
      const locationScore = Math.max(0, 100 - distance / 10) // Decrease by 1 point per 10 miles
      score += (locationScore * locationWeight) / 100
      totalWeight += locationWeight
    }

    // Interest compatibility (weight: 30%)
    const interestWeight = 30
    const commonInterests = profile1.interests.filter((interest) => profile2.interests.includes(interest))
    const interestScore =
      (commonInterests.length / Math.max(profile1.interests.length, profile2.interests.length)) * 100
    score += (interestScore * interestWeight) / 100
    totalWeight += interestWeight

    // Education compatibility (weight: 15%)
    if (profile1.education && profile2.education) {
      const educationWeight = 15
      const educationScore = profile1.education === profile2.education ? 100 : 70
      score += (educationScore * educationWeight) / 100
      totalWeight += educationWeight
    }

    // Religion compatibility (weight: 10%)
    if (profile1.religion && profile2.religion) {
      const religionWeight = 10
      const religionScore = profile1.religion === profile2.religion ? 100 : 50
      score += (religionScore * religionWeight) / 100
      totalWeight += religionWeight
    }

    // Normalize score based on available data
    const finalScore = totalWeight > 0 ? (score / totalWeight) * 100 : 50

    return Math.round(Math.min(100, Math.max(0, finalScore)))
  }

  // Calculate distance between two coordinates (in miles)
  calculateDistance(coords1, coords2) {
    const [lon1, lat1] = coords1
    const [lon2, lat2] = coords2

    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  // Update trust score based on user behavior
  async updateTrustScore(userId, behaviorData) {
    const profile = await Profile.findOne({ userId })
    if (!profile) return

    let trustScore = profile.trustScore

    // Positive behaviors
    if (behaviorData.profileComplete) trustScore += 5
    if (behaviorData.photoVerified) trustScore += 10
    if (behaviorData.phoneVerified) trustScore += 10
    if (behaviorData.emailVerified) trustScore += 5
    if (behaviorData.positiveInteractions) trustScore += behaviorData.positiveInteractions * 2

    // Negative behaviors
    if (behaviorData.reportsFiled) trustScore -= behaviorData.reportsFiled * 10
    if (behaviorData.inappropriateMessages) trustScore -= behaviorData.inappropriateMessages * 5
    if (behaviorData.ghostingBehavior) trustScore -= 15

    // Keep score within bounds
    trustScore = Math.max(0, Math.min(100, trustScore))

    profile.trustScore = trustScore
    await profile.save()

    return trustScore
  }
}

module.exports = new MatchingService()
