import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    memberName: {
      type: String,
      required: [true, "Member name is required"],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },

    // 🌩️ Cloudinary URL
    image: {
      type: String,
      required: [true, "Image is required"],
    },

    // 🌩️ Cloudinary Unique Public ID (NEEDED for delete)
    cloudinaryPublicId: {
      type: String,
      required: [true, "Cloudinary Public ID is required"],
      unique: true, // makes it unique
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Member = mongoose.models.Member || mongoose.model("Member", memberSchema);
export default Member;
