import mongoose from "mongoose";

const db = async (url) => {
  try {
    await mongoose.connect(url);
    console.log("✅ Connected to database successfully");
    
  } catch (error) {
    console.log("❌ Database connection failed:", error);
  }
};

export default db;