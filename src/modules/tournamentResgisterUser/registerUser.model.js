import mongoose from "mongoose";

const registerUserSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
},
{
    timestamps:true
}
);


const registerUser = mongoose.models.registerUser || mongoose.model("registerUser", registerUserSchema);

export default registerUser;
