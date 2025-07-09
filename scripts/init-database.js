const { MongoClient } = require("mongodb")

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ballup_game"

async function initializeDatabase() {
  let client

  try {
    console.log("Connecting to MongoDB...")
    client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db()
    console.log("Connected to MongoDB successfully!")

    // Create collections and indexes
    console.log("Creating collections and indexes...")

    // Users Collection
    await db.collection("users").createIndex({ username: 1 }, { unique: true })
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("users").createIndex({ totalScore: -1 })
    await db.collection("users").createIndex({ bestScore: -1 })
    await db.collection("users").createIndex({ rank: 1 })
    await db.collection("users").createIndex({ createdAt: 1 })
    console.log("✓ Users collection indexes created")

    // Scores Collection
    await db.collection("scores").createIndex({ userId: 1 })
    await db.collection("scores").createIndex({ score: -1 })
    await db.collection("scores").createIndex({ gameMode: 1 })
    await db.collection("scores").createIndex({ createdAt: -1 })
    await db.collection("scores").createIndex({ userId: 1, createdAt: -1 })
    console.log("✓ Scores collection indexes created")

    // Friends Collection
    await db.collection("friends").createIndex({ userId: 1 })
    await db.collection("friends").createIndex({ friendId: 1 })
    await db.collection("friends").createIndex({ status: 1 })
    await db.collection("friends").createIndex({ userId: 1, friendId: 1 }, { unique: true })
    await db.collection("friends").createIndex({ createdAt: 1 })
    console.log("✓ Friends collection indexes created")

    // Rooms Collection
    await db.collection("rooms").createIndex({ roomCode: 1 }, { unique: true })
    await db.collection("rooms").createIndex({ hostId: 1 })
    await db.collection("rooms").createIndex({ status: 1 })
    await db.collection("rooms").createIndex({ gameMode: 1 })
    await db.collection("rooms").createIndex({ createdAt: 1 })
    console.log("✓ Rooms collection indexes created")

    // Shop Collection
    await db.collection("shop").createIndex({ itemId: 1 }, { unique: true })
    await db.collection("shop").createIndex({ category: 1 })
    await db.collection("shop").createIndex({ rarity: 1 })
    await db.collection("shop").createIndex({ price: 1 })
    console.log("✓ Shop collection indexes created")

    // User Inventory Collection
    await db.collection("inventory").createIndex({ userId: 1 })
    await db.collection("inventory").createIndex({ itemId: 1 })
    await db.collection("inventory").createIndex({ userId: 1, itemId: 1 }, { unique: true })
    await db.collection("inventory").createIndex({ purchaseDate: 1 })
    console.log("✓ Inventory collection indexes created")

    // Achievements Collection
    await db.collection("achievements").createIndex({ achievementId: 1 }, { unique: true })
    await db.collection("achievements").createIndex({ category: 1 })
    await db.collection("achievements").createIndex({ difficulty: 1 })
    console.log("✓ Achievements collection indexes created")

    // User Achievements Collection
    await db.collection("userAchievements").createIndex({ userId: 1 })
    await db.collection("userAchievements").createIndex({ achievementId: 1 })
    await db.collection("userAchievements").createIndex({ userId: 1, achievementId: 1 }, { unique: true })
    await db.collection("userAchievements").createIndex({ unlockedAt: 1 })
    console.log("✓ User achievements collection indexes created")

    // Match History Collection
    await db.collection("matchHistory").createIndex({ userId: 1 })
    await db.collection("matchHistory").createIndex({ gameMode: 1 })
    await db.collection("matchHistory").createIndex({ result: 1 })
    await db.collection("matchHistory").createIndex({ createdAt: -1 })
    await db.collection("matchHistory").createIndex({ userId: 1, createdAt: -1 })
    console.log("✓ Match history collection indexes created")

    // Leaderboards Collection
    await db.collection("leaderboards").createIndex({ type: 1 })
    await db.collection("leaderboards").createIndex({ rank: 1 })
    await db.collection("leaderboards").createIndex({ score: -1 })
    await db.collection("leaderboards").createIndex({ updatedAt: 1 })
    console.log("✓ Leaderboards collection indexes created")

    // Reports Collection
    await db.collection("reports").createIndex({ reporterId: 1 })
    await db.collection("reports").createIndex({ reportedUserId: 1 })
    await db.collection("reports").createIndex({ status: 1 })
    await db.collection("reports").createIndex({ createdAt: 1 })
    console.log("✓ Reports collection indexes created")

    // Sessions Collection (with TTL for auto-cleanup)
    await db.collection("sessions").createIndex({ userId: 1 })
    await db.collection("sessions").createIndex({ socketId: 1 })
    await db.collection("sessions").createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
    console.log("✓ Sessions collection indexes created")

    // Create admin user if doesn't exist
    const adminExists = await db.collection("users").findOne({ username: "ReikerDefeat" })
    if (!adminExists) {
      const bcrypt = require("bcryptjs")
      const hashedPassword = await bcrypt.hash("admin123", 10)

      await db.collection("users").insertOne({
        username: "ReikerDefeat",
        email: "admin@ballup.com",
        passwordHash: hashedPassword,
        premium: true,
        rank: "Admin",
        coins: 999999,
        honor: 100,
        totalScore: 0,
        gamesPlayed: 0,
        bestScore: 0,
        wins: 0,
        losses: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
      })
      console.log('✓ Admin user "ReikerDefeat" created')
    } else {
      console.log("✓ Admin user already exists")
    }

    console.log("\n🎉 Database initialization completed successfully!")
    console.log("📊 Collections created with proper indexes")
    console.log("👑 Admin user ready: ReikerDefeat / admin123")
  } catch (error) {
    console.error("❌ Database initialization failed:", error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log("📝 Database connection closed")
    }
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
}

module.exports = { initializeDatabase }
