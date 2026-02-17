const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  try {
    await Promise.race([
      mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        retryWrites: true,
        w: "majority",
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("MongoDB connection timeout")),
          10000,
        ),
      ),
    ]);
    console.log("✓ MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.warn("⚠ Starting server anyway (database operations will fail)");
    // Don't throw - let server start so frontend can load
  }
}

module.exports = { connectDB };
