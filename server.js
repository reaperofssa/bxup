const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const { MongoClient, ObjectId } = require("mongodb")
const http = require("http")
const socketIo = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ballup_game"
let db

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"

// Initialize MongoDB connection
async function initDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db()

    // Create indexes
    await db.collection("users").createIndex({ username: 1 }, { unique: true })
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("scores").createIndex({ userId: 1 })
    await db.collection("scores").createIndex({ score: -1 })
    await db.collection("friends").createIndex({ userId: 1 })
    await db.collection("rooms").createIndex({ roomCode: 1 }, { unique: true })

    // Create admin user if doesn't exist
    const adminExists = await db.collection("users").findOne({ username: "ReikerDefeat" })
    if (!adminExists) {
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
    }

    console.log("MongoDB connected successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    process.exit(1)
  }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// Rank calculation
function calculateRank(totalScore) {
  if (totalScore >= 50000) return "Diamond"
  if (totalScore >= 25000) return "Platinum"
  if (totalScore >= 10000) return "Gold"
  if (totalScore >= 5000) return "Silver"
  return "Bronze"
}

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password || !email) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Check if user exists
    const existingUser = await db.collection("users").findOne({
      $or: [{ username }, { email }],
    })

    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await db.collection("users").insertOne({
      username,
      email,
      passwordHash: hashedPassword,
      premium: false,
      rank: "Bronze",
      coins: 0,
      honor: 100,
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0,
      wins: 0,
      losses: 0,
      createdAt: new Date(),
      lastLogin: new Date(),
    })

    res.json({ success: true, message: "User created successfully" })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" })
    }

    // Get user
    const user = await db.collection("users").findOne({ username })

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    // Update last login
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } })

    // Generate token
    const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: "7d" })

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        coins: user.coins,
        rank: user.rank,
        honor: user.honor,
        premium: user.premium,
        totalScore: user.totalScore,
        gamesPlayed: user.gamesPlayed,
        bestScore: user.bestScore,
        wins: user.wins,
        losses: user.losses,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// User Profile Routes
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.user.userId) }, { projection: { passwordHash: 0 } })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ success: true, user })
  } catch (error) {
    console.error("Profile error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Game Routes
app.post("/api/game/score", authenticateToken, async (req, res) => {
  try {
    const { score, coinsEarned, gameMode = "solo" } = req.body
    const userId = new ObjectId(req.user.userId)

    // Insert score
    await db.collection("scores").insertOne({
      userId,
      score,
      coinsEarned,
      gameMode,
      createdAt: new Date(),
    })

    // Update user stats
    const user = await db.collection("users").findOne({ _id: userId })

    const newTotalScore = user.totalScore + score
    const newGamesPlayed = user.gamesPlayed + 1
    const newBestScore = Math.max(user.bestScore, score)
    const newCoins = user.coins + coinsEarned
    const newRank = calculateRank(newTotalScore)

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          totalScore: newTotalScore,
          gamesPlayed: newGamesPlayed,
          bestScore: newBestScore,
          coins: newCoins,
          rank: newRank,
        },
      },
    )

    res.json({ success: true, newRank, newCoins })
  } catch (error) {
    console.error("Score submission error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/leaderboard", async (req, res) => {
  try {
    const { type = "allTime", limit = 50 } = req.query
    const limitNum = Number.parseInt(limit)

    let pipeline = []

    if (type === "daily") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      pipeline = [
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: "$userId", bestScore: { $max: "$score" } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { username: "$user.username", premium: "$user.premium", bestScore: 1, rank: "$user.rank" } },
        { $sort: { bestScore: -1 } },
        { $limit: limitNum },
      ]

      const result = await db.collection("scores").aggregate(pipeline).toArray()
      res.json({ success: true, leaderboard: result })
    } else if (type === "weekly") {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      pipeline = [
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: "$userId", bestScore: { $max: "$score" } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { username: "$user.username", premium: "$user.premium", bestScore: 1, rank: "$user.rank" } },
        { $sort: { bestScore: -1 } },
        { $limit: limitNum },
      ]

      const result = await db.collection("scores").aggregate(pipeline).toArray()
      res.json({ success: true, leaderboard: result })
    } else {
      // All time - use user's best scores
      const users = await db
        .collection("users")
        .find({}, { projection: { username: 1, premium: 1, bestScore: 1, rank: 1 } })
        .sort({ bestScore: -1 })
        .limit(limitNum)
        .toArray()

      res.json({ success: true, leaderboard: users })
    }
  } catch (error) {
    console.error("Leaderboard error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Friends Routes
app.get("/api/friends/list", authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId)

    const friendships = await db
      .collection("friends")
      .aggregate([
        { $match: { $or: [{ userId }, { friendId: userId }], status: "accepted" } },
        {
          $lookup: {
            from: "users",
            localField: userId.equals(userId) ? "friendId" : "userId",
            foreignField: "_id",
            as: "friend",
          },
        },
        { $unwind: "$friend" },
        {
          $project: {
            username: "$friend.username",
            premium: "$friend.premium",
            rank: "$friend.rank",
            status: "offline", // TODO: Implement real-time status
          },
        },
      ])
      .toArray()

    res.json({ success: true, friends: friendships })
  } catch (error) {
    console.error("Friends list error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/friends/requests", authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId)

    const requests = await db
      .collection("friends")
      .aggregate([
        { $match: { friendId: userId, status: "pending" } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "requester",
          },
        },
        { $unwind: "$requester" },
        {
          $project: {
            username: "$requester.username",
            premium: "$requester.premium",
            rank: "$requester.rank",
          },
        },
      ])
      .toArray()

    res.json({ success: true, requests })
  } catch (error) {
    console.error("Friend requests error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/friends/add", authenticateToken, async (req, res) => {
  try {
    const { friendUsername } = req.body
    const userId = new ObjectId(req.user.userId)

    // Find friend
    const friend = await db.collection("users").findOne({ username: friendUsername })
    if (!friend) {
      return res.status(404).json({ error: "User not found" })
    }

    const friendId = friend._id

    // Check if already friends or request exists
    const existing = await db.collection("friends").findOne({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    })

    if (existing) {
      return res.status(400).json({ error: "Friend request already exists or you are already friends" })
    }

    // Create friend request
    await db.collection("friends").insertOne({
      userId,
      friendId,
      status: "pending",
      createdAt: new Date(),
    })

    res.json({ success: true, message: "Friend request sent" })
  } catch (error) {
    console.error("Add friend error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/friends/accept", authenticateToken, async (req, res) => {
  try {
    const { friendUsername } = req.body
    const userId = new ObjectId(req.user.userId)

    // Find friend
    const friend = await db.collection("users").findOne({ username: friendUsername })
    if (!friend) {
      return res.status(404).json({ error: "User not found" })
    }

    // Update friend request
    await db
      .collection("friends")
      .updateOne({ userId: friend._id, friendId: userId, status: "pending" }, { $set: { status: "accepted" } })

    res.json({ success: true, message: "Friend request accepted" })
  } catch (error) {
    console.error("Accept friend error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/friends/decline", authenticateToken, async (req, res) => {
  try {
    const { friendUsername } = req.body
    const userId = new ObjectId(req.user.userId)

    // Find friend
    const friend = await db.collection("users").findOne({ username: friendUsername })
    if (!friend) {
      return res.status(404).json({ error: "User not found" })
    }

    // Delete friend request
    await db.collection("friends").deleteOne({
      userId: friend._id,
      friendId: userId,
      status: "pending",
    })

    res.json({ success: true, message: "Friend request declined" })
  } catch (error) {
    console.error("Decline friend error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/friends/remove", authenticateToken, async (req, res) => {
  try {
    const { friendUsername } = req.body
    const userId = new ObjectId(req.user.userId)

    // Find friend
    const friend = await db.collection("users").findOne({ username: friendUsername })
    if (!friend) {
      return res.status(404).json({ error: "User not found" })
    }

    const friendId = friend._id

    // Remove friendship
    await db.collection("friends").deleteOne({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
      status: "accepted",
    })

    res.json({ success: true, message: "Friend removed" })
  } catch (error) {
    console.error("Remove friend error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Room/PvP Routes
app.post("/api/rooms/create", authenticateToken, async (req, res) => {
  try {
    const { maxPlayers = 4 } = req.body
    const userId = new ObjectId(req.user.userId)

    // Generate room code
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase()

    // Create room
    await db.collection("rooms").insertOne({
      roomCode,
      hostId: userId,
      players: [userId],
      maxPlayers,
      status: "waiting",
      gameMode: "private",
      createdAt: new Date(),
    })

    res.json({ success: true, roomCode })
  } catch (error) {
    console.error("Create room error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/rooms/join", authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.body
    const userId = new ObjectId(req.user.userId)

    // Find room
    const room = await db.collection("rooms").findOne({ roomCode, status: "waiting" })
    if (!room) {
      return res.status(404).json({ error: "Room not found or already started" })
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: "Room is full" })
    }

    if (room.players.some((p) => p.equals(userId))) {
      return res.status(400).json({ error: "Already in room" })
    }

    // Add player to room
    await db.collection("rooms").updateOne({ roomCode }, { $push: { players: userId } })

    res.json({ success: true, message: "Joined room successfully" })
  } catch (error) {
    console.error("Join room error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Matchmaking Routes
app.post("/api/matchmaking/find", authenticateToken, async (req, res) => {
  try {
    const { gameMode = "quickMatch" } = req.body
    const userId = new ObjectId(req.user.userId)

    // Simple matchmaking - find or create a room
    const room = await db.collection("rooms").findOne({
      gameMode,
      status: "waiting",
      players: { $size: { $lt: 2 } },
    })

    if (!room) {
      // Create new room
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase()
      await db.collection("rooms").insertOne({
        roomCode,
        hostId: userId,
        players: [userId],
        maxPlayers: 2,
        status: "waiting",
        gameMode,
        createdAt: new Date(),
      })

      // Wait for another player (simplified)
      setTimeout(async () => {
        const updatedRoom = await db.collection("rooms").findOne({ roomCode })
        if (updatedRoom && updatedRoom.players.length < 2) {
          // No match found, remove room
          await db.collection("rooms").deleteOne({ roomCode })
        }
      }, 30000)

      res.json({ success: false, message: "Searching for match..." })
    } else {
      // Join existing room
      await db.collection("rooms").updateOne(
        { _id: room._id },
        {
          $push: { players: userId },
          $set: { status: "ready" },
        },
      )

      res.json({ success: true, roomId: room.roomCode })
    }
  } catch (error) {
    console.error("Matchmaking error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Admin Routes
app.post("/api/admin/grant-premium", authenticateToken, async (req, res) => {
  try {
    const { targetUsername } = req.body
    const adminUser = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) })

    if (adminUser.username !== "ReikerDefeat") {
      return res.status(403).json({ error: "Admin access required" })
    }

    await db.collection("users").updateOne({ username: targetUsername }, { $set: { premium: true } })

    res.json({ success: true, message: "Premium granted" })
  } catch (error) {
    console.error("Grant premium error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Shop Routes
app.get("/api/shop/items", async (req, res) => {
  try {
    const { category } = req.query

    const query = {}
    if (category) {
      query.category = category
    }

    const items = await db.collection("shop").find(query).toArray()
    res.json({ success: true, items })
  } catch (error) {
    console.error("Shop items error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/shop/purchase", authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.body
    const userId = new ObjectId(req.user.userId)

    // Get item details
    const item = await db.collection("shop").findOne({ itemId })
    if (!item) {
      return res.status(404).json({ error: "Item not found" })
    }

    // Check if user already owns the item
    const existingItem = await db.collection("inventory").findOne({ userId, itemId })
    if (existingItem) {
      return res.status(400).json({ error: "Item already owned" })
    }

    // Get user data
    const user = await db.collection("users").findOne({ _id: userId })

    // Check premium requirement
    if (item.premiumOnly && !user.premium) {
      return res.status(400).json({ error: "Premium membership required" })
    }

    // Check if user has enough coins
    if (user.coins < item.price) {
      return res.status(400).json({ error: "Insufficient coins" })
    }

    // Process purchase
    await db.collection("users").updateOne({ _id: userId }, { $inc: { coins: -item.price } })

    await db.collection("inventory").insertOne({
      userId,
      itemId,
      purchaseDate: new Date(),
      price: item.price,
    })

    res.json({ success: true, message: "Item purchased successfully" })
  } catch (error) {
    console.error("Purchase error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/shop/inventory", authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId)

    const inventory = await db
      .collection("inventory")
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "shop",
            localField: "itemId",
            foreignField: "itemId",
            as: "item",
          },
        },
        { $unwind: "$item" },
        {
          $project: {
            itemId: 1,
            purchaseDate: 1,
            name: "$item.name",
            category: "$item.category",
            rarity: "$item.rarity",
            preview: "$item.preview",
          },
        },
      ])
      .toArray()

    res.json({ success: true, inventory })
  } catch (error) {
    console.error("Inventory error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Achievements Routes
app.get("/api/achievements", async (req, res) => {
  try {
    const achievements = await db.collection("achievements").find({}).toArray()
    res.json({ success: true, achievements })
  } catch (error) {
    console.error("Achievements error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/achievements/user", authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId)

    const userAchievements = await db
      .collection("userAchievements")
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: "achievements",
            localField: "achievementId",
            foreignField: "achievementId",
            as: "achievement",
          },
        },
        { $unwind: "$achievement" },
        {
          $project: {
            achievementId: 1,
            unlockedAt: 1,
            name: "$achievement.name",
            description: "$achievement.description",
            icon: "$achievement.icon",
            category: "$achievement.category",
            difficulty: "$achievement.difficulty",
          },
        },
      ])
      .toArray()

    res.json({ success: true, achievements: userAchievements })
  } catch (error) {
    console.error("User achievements error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/achievements/unlock", authenticateToken, async (req, res) => {
  try {
    const { achievementId } = req.body
    const userId = new ObjectId(req.user.userId)

    // Check if achievement exists
    const achievement = await db.collection("achievements").findOne({ achievementId })
    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" })
    }

    // Check if already unlocked
    const existing = await db.collection("userAchievements").findOne({ userId, achievementId })
    if (existing) {
      return res.status(400).json({ error: "Achievement already unlocked" })
    }

    // Unlock achievement
    await db.collection("userAchievements").insertOne({
      userId,
      achievementId,
      unlockedAt: new Date(),
    })

    // Award coins if specified
    if (achievement.reward && achievement.reward.coins) {
      await db.collection("users").updateOne({ _id: userId }, { $inc: { coins: achievement.reward.coins } })
    }

    res.json({
      success: true,
      message: "Achievement unlocked!",
      reward: achievement.reward,
    })
  } catch (error) {
    console.error("Unlock achievement error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Battle Royale Routes
app.post("/api/battleroyale/join", authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId)

    // Find or create battle royale room
    const room = await db.collection("rooms").findOne({
      gameMode: "battleRoyale",
      status: "waiting",
      players: { $size: { $lt: 3 } },
    })

    if (!room) {
      // Create new battle royale room
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase()
      await db.collection("rooms").insertOne({
        roomCode,
        hostId: userId,
        players: [userId],
        maxPlayers: 3,
        status: "waiting",
        gameMode: "battleRoyale",
        createdAt: new Date(),
      })

      res.json({ success: true, message: "Waiting for players...", roomCode })
    } else {
      // Join existing room
      await db.collection("rooms").updateOne({ _id: room._id }, { $push: { players: userId } })

      // Check if room is full
      const updatedRoom = await db.collection("rooms").findOne({ _id: room._id })
      if (updatedRoom.players.length >= 3) {
        await db.collection("rooms").updateOne({ _id: room._id }, { $set: { status: "ready" } })
      }

      res.json({
        success: true,
        message: "Joined battle royale!",
        roomCode: room.roomCode,
        playersCount: updatedRoom.players.length,
      })
    }
  } catch (error) {
    console.error("Battle royale join error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Honor System Routes
app.post("/api/game/quit", authenticateToken, async (req, res) => {
  try {
    const { gameMode, roomId } = req.body
    const userId = new ObjectId(req.user.userId)

    // Penalize honor for quitting multiplayer/ranked games
    if (gameMode === "pvp" || gameMode === "ranked" || gameMode === "battleRoyale") {
      await db.collection("users").updateOne({ _id: userId }, { $inc: { honor: -10 } })

      // Record the quit
      await db.collection("matchHistory").insertOne({
        userId,
        gameMode,
        result: "quit",
        honorPenalty: -10,
        createdAt: new Date(),
      })
    }

    res.json({ success: true, message: "Game quit recorded" })
  } catch (error) {
    console.error("Game quit error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Admin Routes (Extended)
app.post("/api/admin/revoke-premium", authenticateToken, async (req, res) => {
  try {
    const { targetUsername } = req.body
    const adminUser = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) })

    if (adminUser.username !== "ReikerDefeat") {
      return res.status(403).json({ error: "Admin access required" })
    }

    await db.collection("users").updateOne({ username: targetUsername }, { $set: { premium: false } })

    res.json({ success: true, message: "Premium revoked" })
  } catch (error) {
    console.error("Revoke premium error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/admin/ban-user", authenticateToken, async (req, res) => {
  try {
    const { targetUsername, reason } = req.body
    const adminUser = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) })

    if (adminUser.username !== "ReikerDefeat") {
      return res.status(403).json({ error: "Admin access required" })
    }

    await db.collection("users").updateOne(
      { username: targetUsername },
      {
        $set: {
          banned: true,
          banReason: reason,
          bannedAt: new Date(),
        },
      },
    )

    res.json({ success: true, message: "User banned successfully" })
  } catch (error) {
    console.error("Ban user error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Socket.IO for real-time features
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("join-room", (roomCode) => {
    socket.join(roomCode)
    socket.to(roomCode).emit("player-joined", socket.id)
  })

  socket.on("game-update", (data) => {
    socket.to(data.roomCode).emit("game-update", data)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// Start server
const PORT = process.env.PORT || 7860

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Game available at http://localhost:${PORT}`)
  })
})
