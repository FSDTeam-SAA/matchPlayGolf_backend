import Member from "./team.model.js";
import { uploadToCloudinary } from "../../lib/uploadToCloudinary.js";

// Create Member
export const createMember = async (req, res) => {
  try {
    const { memberName, designation, description } = req.body;

    // Validate image
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileBuffer = req.file.buffer;

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      fileBuffer,
      "members_image",
      "ourTeam_images"
    );

    if (!uploadResult?.secure_url || !uploadResult?.public_id) {
      return res.status(500).json({
        success: false,
        message: "File upload failed",
      });
    }

    // Create Member in DB
    const member = await Member.create({
      memberName,
      designation,
      description,
      image: uploadResult.secure_url, // Image URL
      cloudinaryPublicId: uploadResult.public_id, // Public ID
    });

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const paginationHandler = (page, limit, sortBy, sortOrder) => {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;

  const skip = (currentPage - 1) * perPage;
  const sortField = String(sortBy || "createdAt");
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  return {
    page: currentPage,
    limit: perPage,
    skip,
    sort: { [sortField]: sortDirection },
  };
};


// Get all members
export const getAllMembers = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;
    console.log("mahabur");

    const {
      page: currentPage,
      limit: perPage,
      skip,
      sort,
    } = paginationHandler(page, limit, sortBy, sortOrder);

    const total = await Member.countDocuments();

    const members = await Member.find()
      .sort(sort)
      .skip(skip)
      .limit(perPage);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get single member
export const getMemberById = async (req, res) => {
  try {
    const { memberId } = req.params;
    console.log(memberId);
    const member = await Member.findById( memberId );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete member
export const deleteMember = async (req, res) => {
  try {
    // 1. Find member first (so we get public_id)
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // 2. Delete image from Cloudinary if exists
    if (member.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(member.cloudinaryPublicId);
    }

    // 3. Delete from MongoDB
    await Member.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
