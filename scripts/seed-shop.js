const { MongoClient } = require("mongodb")

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ballup_game"

const shopItems = [
  // Balls
  {
    itemId: "default_ball",
    name: "Classic Ball",
    description: "The original ball that started it all",
    category: "balls",
    price: 0,
    rarity: "common",
    preview: "⚪",
    gradient: "linear-gradient(45deg, #8a2be2, #da70d6)",
    effects: [],
    createdAt: new Date(),
  },
  {
    itemId: "rainbow_ball",
    name: "Rainbow Ball",
    description: "Colorful ball that cycles through rainbow colors",
    category: "balls",
    price: 100,
    rarity: "rare",
    preview: "🌈",
    gradient: "linear-gradient(45deg, #ff0000, #00ff00, #0000ff)",
    effects: ["rainbow_cycle"],
    createdAt: new Date(),
  },
  {
    itemId: "gold_ball",
    name: "Golden Ball",
    description: "Luxurious golden ball for the elite players",
    category: "balls",
    price: 500,
    rarity: "epic",
    preview: "🟡",
    gradient: "linear-gradient(45deg, #ffd700, #ffed4e)",
    effects: ["golden_glow"],
    createdAt: new Date(),
  },
  {
    itemId: "diamond_ball",
    name: "Diamond Ball",
    description: "Sparkling diamond ball with crystal effects",
    category: "balls",
    price: 1000,
    rarity: "legendary",
    preview: "💎",
    gradient: "linear-gradient(45deg, #b9f2ff, #ffffff)",
    effects: ["diamond_sparkle"],
    createdAt: new Date(),
  },
  {
    itemId: "shadow_ball",
    name: "Shadow Ball",
    description: "Mysterious dark ball with shadow trail",
    category: "balls",
    price: 750,
    rarity: "epic",
    preview: "⚫",
    gradient: "linear-gradient(45deg, #000000, #333333)",
    effects: ["shadow_trail"],
    createdAt: new Date(),
  },
  {
    itemId: "lightning_ball",
    name: "Lightning Ball",
    description: "Exclusive premium ball with electric effects and speed boost",
    category: "balls",
    price: 0,
    rarity: "legendary",
    preview: "⚡",
    gradient: "linear-gradient(45deg, #ffd700, #ffed4e)",
    effects: ["lightning_effect", "speed_boost"],
    premiumOnly: true,
    createdAt: new Date(),
  },
  {
    itemId: "fire_ball",
    name: "Fire Ball",
    description: "Blazing red ball with fire trail effects",
    category: "balls",
    price: 200,
    rarity: "rare",
    preview: "🔴",
    gradient: "linear-gradient(45deg, #ff6b6b, #ee5a52)",
    effects: ["fire_trail"],
    createdAt: new Date(),
  },
  {
    itemId: "ice_ball",
    name: "Ice Ball",
    description: "Frozen ball with ice crystal effects",
    category: "balls",
    price: 200,
    rarity: "rare",
    preview: "🔵",
    gradient: "linear-gradient(45deg, #74c0fc, #339af0)",
    effects: ["ice_crystals"],
    createdAt: new Date(),
  },

  // Trails
  {
    itemId: "fire_trail",
    name: "Fire Trail",
    description: "Blazing fire trail that follows your ball",
    category: "trails",
    price: 200,
    rarity: "rare",
    preview: "🔥",
    gradient: "linear-gradient(45deg, #ff6b6b, #ee5a52)",
    effects: ["fire_particles"],
    createdAt: new Date(),
  },
  {
    itemId: "ice_trail",
    name: "Ice Trail",
    description: "Freezing ice crystals trail",
    category: "trails",
    price: 200,
    rarity: "rare",
    preview: "❄️",
    gradient: "linear-gradient(45deg, #74c0fc, #339af0)",
    effects: ["ice_crystals"],
    createdAt: new Date(),
  },
  {
    itemId: "star_trail",
    name: "Star Trail",
    description: "Magical star particles trail",
    category: "trails",
    price: 400,
    rarity: "epic",
    preview: "⭐",
    gradient: "linear-gradient(45deg, #ffd43b, #fab005)",
    effects: ["star_particles"],
    createdAt: new Date(),
  },
  {
    itemId: "rainbow_trail",
    name: "Rainbow Trail",
    description: "Colorful rainbow particle trail",
    category: "trails",
    price: 600,
    rarity: "epic",
    preview: "🌈",
    gradient: "linear-gradient(45deg, #ff0000, #00ff00, #0000ff)",
    effects: ["rainbow_particles"],
    createdAt: new Date(),
  },

  // Power-up Boosters
  {
    itemId: "extra_jump",
    name: "Extra Jump Pack",
    description: "Start each game with an extra jump power-up",
    category: "powerups",
    price: 50,
    rarity: "common",
    preview: "🦘",
    gradient: "linear-gradient(45deg, #51cf66, #40c057)",
    effects: ["start_with_double_jump"],
    createdAt: new Date(),
  },
  {
    itemId: "shield_start",
    name: "Shield Starter",
    description: "Begin every game with a protective shield",
    category: "powerups",
    price: 100,
    rarity: "rare",
    preview: "🛡️",
    gradient: "linear-gradient(45deg, #74c0fc, #339af0)",
    effects: ["start_with_shield"],
    createdAt: new Date(),
  },
  {
    itemId: "rocket_boost",
    name: "Rocket Boost Pack",
    description: "Start with a rocket boost power-up",
    category: "powerups",
    price: 150,
    rarity: "rare",
    preview: "🚀",
    gradient: "linear-gradient(45deg, #ff6b6b, #ee5a52)",
    effects: ["start_with_rocket"],
    createdAt: new Date(),
  },
  {
    itemId: "magnet_power",
    name: "Magnet Power",
    description: "Begin with magnet to attract power-ups",
    category: "powerups",
    price: 120,
    rarity: "rare",
    preview: "🧲",
    gradient: "linear-gradient(45deg, #ffd43b, #fab005)",
    effects: ["start_with_magnet"],
    createdAt: new Date(),
  },

  // Titles
  {
    itemId: "jumper_title",
    name: "Sky Jumper",
    description: "Show off your jumping skills",
    category: "titles",
    price: 150,
    rarity: "common",
    preview: "🌤️",
    gradient: "linear-gradient(45deg, #74c0fc, #339af0)",
    effects: [],
    createdAt: new Date(),
  },
  {
    itemId: "champion_title",
    name: "Champion",
    description: "For the ultimate winners",
    category: "titles",
    price: 1000,
    rarity: "legendary",
    preview: "🏆",
    gradient: "linear-gradient(45deg, #ffd43b, #fab005)",
    effects: [],
    createdAt: new Date(),
  },
  {
    itemId: "master_title",
    name: "Ball Master",
    description: "Master of the ball game",
    category: "titles",
    price: 500,
    rarity: "epic",
    preview: "⚡",
    gradient: "linear-gradient(45deg, #8b5cf6, #7c3aed)",
    effects: [],
    createdAt: new Date(),
  },
  {
    itemId: "legend_title",
    name: "Legend",
    description: "Legendary status for elite players",
    category: "titles",
    price: 2000,
    rarity: "legendary",
    preview: "👑",
    gradient: "linear-gradient(45deg, #ffd700, #f59e0b)",
    effects: [],
    createdAt: new Date(),
  },

  // Special Items
  {
    itemId: "premium_ball",
    name: "Premium Orb",
    description: "Exclusive premium member ball with special effects",
    category: "balls",
    price: 0,
    rarity: "legendary",
    preview: "✨",
    gradient: "linear-gradient(45deg, #ffd700, #f59e0b)",
    effects: ["premium_glow", "coin_bonus"],
    premiumOnly: true,
    createdAt: new Date(),
  },
]

async function seedShop() {
  let client

  try {
    console.log("Connecting to MongoDB...")
    client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db()
    console.log("Connected to MongoDB successfully!")

    // Clear existing shop items
    await db.collection("shop").deleteMany({})
    console.log("🗑️  Cleared existing shop items")

    // Insert new shop items
    const result = await db.collection("shop").insertMany(shopItems)
    console.log(`✅ Inserted ${result.insertedCount} shop items successfully!`)

    // Display items by category
    const categories = [...new Set(shopItems.map((item) => item.category))]
    console.log("\n🛒 Shop items by category:")

    for (const category of categories) {
      const categoryItems = shopItems.filter((item) => item.category === category)
      console.log(`\n${category.toUpperCase()}:`)
      categoryItems.forEach((item) => {
        const premiumText = item.premiumOnly ? " (Premium Only)" : ""
        const priceText = item.price === 0 ? "Free" : `${item.price} coins`
        console.log(`  ${item.preview} ${item.name} - ${priceText}${premiumText}`)
      })
    }

    // Display rarity distribution
    const rarities = [...new Set(shopItems.map((item) => item.rarity))]
    console.log("\n💎 Items by rarity:")
    rarities.forEach((rarity) => {
      const count = shopItems.filter((item) => item.rarity === rarity).length
      console.log(`  ${rarity}: ${count} items`)
    })

    console.log("\n🎉 Shop seeding completed successfully!")
  } catch (error) {
    console.error("❌ Shop seeding failed:", error)
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
  seedShop()
}

module.exports = { seedShop }
