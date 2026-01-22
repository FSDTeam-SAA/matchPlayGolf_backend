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
    const  memberId  = req.params.memberId;
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
export const updateMemberById = async(req, res) => {
  try{

    const memberId = req.params.memberId;
    console.log(memberId);
    const member = await Member.findById(memberId);
    const { memberName, designation, description } = req.body;

    if(!member){
      res.status(404).json({
        success:false,
        message:"Member not found provide correct member id mahabur",
      })
    }

    const updateMember = {
     memberName: memberName || member.memberName,
     designation: designation || member.designation,
     description:description || member.description
    }

    if(req.file && req.file.buffer){

      
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
        updateMember.image = uploadResult.secure_url;
        updateMember.cloudinaryPublicId = uploadResult.public_id;
      }

      const updateAllData = await Member.findByIdAndUpdate(
        memberId,
        { $set: updateMember },
        { new: true }
    );

    res.status(201).json({
      success:true,
      message: "Member updated successfully",
      member: updateAllData
    });
      
  }catch(err){
    res.status(500).json({
      success:false,
      message:"Member not foound or provide valid id"
    })
  }
}

// Delete member
export const deleteMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Delete Cloudinary image safely
    if (member.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(member.cloudinaryPublicId);
      } catch (err) {
        console.error("Cloudinary Delete Error:", err.message);
        // Do NOT return here — DB delete must continue
      }
    }

    // Delete DB record
    await Member.findByIdAndDelete(memberId);

    return res.status(200).json({
      success: true,
      message: "Member deleted successfully",
    });

  } catch (error) {
    console.error("Delete Member Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting the member",
    });
  }
};

