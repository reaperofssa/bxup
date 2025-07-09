const { initializeDatabase } = require("./init-database")
const { seedAchievements } = require("./seed-achievements")
const { seedShop } = require("./seed-shop")

async function setupDatabase() {
  console.log("🚀 Starting Ball Up Game database setup...\n")

  try {
    // Step 1: Initialize database with indexes and admin user
    console.log("📊 Step 1: Initializing database...")
    await initializeDatabase()

    console.log("\n⏳ Waiting 2 seconds before seeding...\n")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Step 2: Seed achievements
    console.log("🏆 Step 2: Seeding achievements...")
    await seedAchievements()

    console.log("\n⏳ Waiting 1 second...\n")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Step 3: Seed shop items
    console.log("🛒 Step 3: Seeding shop items...")
    await seedShop()

    console.log("\n✨ Database setup completed successfully!")
    console.log("\n📋 Setup Summary:")
    console.log("  ✅ Database collections and indexes created")
    console.log("  ✅ Admin user created (ReikerDefeat / admin123)")
    console.log("  ✅ 15+ achievements loaded")
    console.log("  ✅ 20+ shop items loaded")
    console.log("\n🎮 Your Ball Up game is ready to launch!")
    console.log('💡 Run "npm start" to start the server')
  } catch (error) {
    console.error("\n❌ Database setup failed:", error)
    console.log("\n🔧 Troubleshooting:")
    console.log("  1. Make sure MongoDB is running")
    console.log("  2. Check your MONGODB_URI connection string")
    console.log("  3. Verify database permissions")
    process.exit(1)
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }
