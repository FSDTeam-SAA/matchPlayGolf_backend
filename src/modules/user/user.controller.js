

export const updateProfile = async(req, res, next) =>{
  try{

    const { fullName, email, phone } = req.body;
    const file = req?.file;
    const userId = req.user._id;

    const result = await updateProfileService( fullName, email, phone, file, userId);
    generateResponse( res, 201, true, "Update profile successfully", result);

  }catch(err){
    generateResponse(res, 404, false, "Provide correct image or file or text", null);
  }
}


export const getAllUsers = async (req, res, next) => {
  try {
    
    // const users = await User.find();
    const currentUserId = req.user._id;
    const users = await User.find({ _id: { $ne: currentUserId } });

    generateResponse(res, 200, true, "Get all user successfully", users);

  } catch (error) {
    if (['users not found'].includes(error.message)) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else {
      next(error);
    }
  }
};



