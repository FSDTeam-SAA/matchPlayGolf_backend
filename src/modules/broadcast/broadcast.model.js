import mongoose from "mongoose";

const SubscribeSchema = new mongoose.Schema(
    {
        email:{
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
)

const brodcastSchema = new mongoose.Schema(
    {
        email:{
            type:String,
            required:true
        },
        subject:{
            type:String,
            required: true
        },
        html:{
            type:String,
            required:" "
        }
    },
    {
        timestamps: true
    }
)

const Subscribe = mongoose.models.Subscribe || mongoose.model('Subscribe', SubscribeSchema);
const Brodcast = mongoose.models.Brodcast || mongoose.model('Brodcast', brodcastSchema);
export { Subscribe, Brodcast };