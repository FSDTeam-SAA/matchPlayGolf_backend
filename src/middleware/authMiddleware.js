// src/middleware/authMiddleware.js
import User from "../modules/user/user.model.js";
import jwt from "jsonwebtoken";
import { accessTokenSecrete } from "../config/config.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized to access" });
    }

    const decoded = jwt.verify(token, accessTokenSecrete);
    req.user = await User.findById(decoded._id || decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const adminMiddleware = (req, res, next) => {
  // Capitalized match
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied: admin only" });
  }
  next();
};
