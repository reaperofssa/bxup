const { MongoClient } = require("mongodb")

// Seed achievements data
const achievements = [
  {
    achievementId: "first_jump",
    name: "First Jump",
    description: "Complete your first jump",
    icon: "🦘",
    category: "gameplay",
    difficulty: "easy",
    requirement: { type: "jumps", value: 1 },
    reward: { coins: 10 },
    createdAt: new Date(),
  },
  {
    achievementId: "height_100",
    name: "Sky Walker",
    description: "Reach height of 100",
    icon: "🌤️",
    category: "height",
    difficulty: "easy",
    requirement: { type: "height", value: 100 },
    reward: { coins: 25 },
    createdAt: new Date(),
  },
  {
    achievementId: "height_500",
    name: "Cloud Jumper",
    description: "Reach height of 500",
    icon: "☁️",
    category: "height",
    difficulty: "medium",
    requirement: { type: "height", value: 500 },
    reward: { coins: 50 },
    createdAt: new Date(),
  },
  {
    achievementId: "height_1000",
    name: "Space Explorer",
    description: "Reach height of 1000",
    icon: "🚀",
    category: "height",
    difficulty: "hard",
    requirement: { type: "height", value: 1000 },
    reward: { coins: 100 },
    createdAt: new Date(),
  },
  {
    achievementId: "height_2000",
    name: "Cosmic Traveler",
    description: "Reach height of 2000",
    icon: "🌌",
    category: "height",
    difficulty: "extreme",
    requirement: { type: "height", value: 2000 },
    reward: { coins: 250 },
    createdAt: new Date(),
  },
  {
    achievementId: "powerup_master",
    name: "Power Master",
    description: "Use 50 power-ups",
    icon: "⚡",
    category: "powerups",
    difficulty: "medium",
    requirement: { type: "powerups_used", value: 50 },
    reward: { coins: 75 },
    createdAt: new Date(),
  },
  {
    achievementId: "combo_king",
    name: "Combo King",
    description: "Achieve 20x combo",
    icon: "🔥",
    category: "skill",
    difficulty: "hard",
    requirement: { type: "max_combo", value: 20 },
    reward: { coins: 100 },
    createdAt: new Date(),
  },
  {
    achievementId: "streak_master",
    name: "Streak Master",
    description: "Achieve 50 platform streak",
    icon: "⚡",
    category: "skill",
    difficulty: "hard",
    requirement: { type: "max_streak", value: 50 },
    reward: { coins: 150 },
    createdAt: new Date(),
  },
  {
    achievementId: "friend_maker",
    name: "Social Butterfly",
    description: "Add 10 friends",
    icon: "👥",
    category: "social",
    difficulty: "medium",
    requirement: { type: "friends_count", value: 10 },
    reward: { coins: 50 },
    createdAt: new Date(),
  },
  {
    achievementId: "winner",
    name: "Champion",
    description: "Win 10 multiplayer matches",
    icon: "🏆",
    category: "multiplayer",
    difficulty: "medium",
    requirement: { type: "multiplayer_wins", value: 10 },
    reward: { coins: 100 },
    createdAt: new Date(),
  },
  {
    achievementId: "perfectionist",
    name: "Perfectionist",
    description: "Complete a game without using any power-ups",
    icon: "💎",
    category: "skill",
    difficulty: "hard",
    requirement: { type: "no_powerups_game", value: 1 },
    reward: { coins: 200 },
    createdAt: new Date(),
  },
  {
    achievementId: "coin_collector",
    name: "Coin Collector",
    description: "Collect 1000 coins total",
    icon: "💰",
    category: "collection",
    difficulty: "medium",
    requirement: { type: "total_coins", value: 1000 },
    reward: { coins: 100 },
    createdAt: new Date(),
  },
  {
    achievementId: "dedicated_player",
    name: "Dedicated Player",
    description: "Play 100 games",
    icon: "🎮",
    category: "dedication",
    difficulty: "medium",
    requirement: { type: "games_played", value: 100 },
    reward: { coins: 150 },
    createdAt: new Date(),
  },
  {
    achievementId: "speed_demon",
    name: "Speed Demon",
    description: "Reach height 500 in under 2 minutes",
    icon: "💨",
    category: "speed",
    difficulty: "hard",
    requirement: { type: "speed_challenge", value: { height: 500, time: 120 } },
    reward: { coins: 200 },
    createdAt: new Date(),
  },
  {
    achievementId: "survivor",
    name: "Survivor",
    description: "Survive 5 minutes in a single game",
    icon: "⏰",
    category: "endurance",
    difficulty: "medium",
    requirement: { type: "survival_time", value: 300 },
    reward: { coins: 75 },
    createdAt: new Date(),
  },
]

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ballup_game"

async function seedAchievements() {
  let client

  try {
    console.log("Connecting to MongoDB...")
    client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db()
    console.log("Connected to MongoDB successfully!")

    // Clear existing achievements
    await db.collection("achievements").deleteMany({})
    console.log("🗑️  Cleared existing achievements")

    // Insert new achievements
    const result = await db.collection("achievements").insertMany(achievements)
    console.log(`✅ Inserted ${result.insertedCount} achievements successfully!`)

    // Display achievements by category
    const categories = [...new Set(achievements.map((a) => a.category))]
    console.log("\n📋 Achievements by category:")

    for (const category of categories) {
      const categoryAchievements = achievements.filter((a) => a.category === category)
      console.log(`\n${category.toUpperCase()}:`)
      categoryAchievements.forEach((achievement) => {
        console.log(`  ${achievement.icon} ${achievement.name} - ${achievement.description}`)
      })
    }

    console.log("\n🎉 Achievement seeding completed successfully!")
  } catch (error) {
    console.error("❌ Achievement seeding failed:", error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log("📝 Database connection closed")
    }
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedAchievements()
}

module.exports = { seedAchievements }
