 import mongoose,{Document,Schema} from "mongoose";
import {UserType} from "../types/user.type";

const userSchema: Schema = new Schema(
    {
        role: { type: String, enum: ["admin", "user", "company"], default: "user" },
        status: {
            type: String,
            enum: ["pending", "verified", "rejected", "suspended"],
            default: "pending",
            required: true,
        },
            firstName: {type:String},
            lastName:{type:String},
        companyName: { type: String },
            email:{type:String,required:true,unique:true},
            contactNo:{type:String,required:true},
            address:{type:String,required:true},
            password:{type:String},
        interestedFields: [{ type: String }],
            profileImage: { type: String,default: null},
        document: {
            type: {
                documentType: {
                    type: String,
                    enum: ["resume", "company_document"],
                    required: true,
                },
                filename: { type: String, required: true },
                originalName: { type: String, required: true },
                mimeType: { type: String, required: true },
                size: { type: Number, required: true },
                uploadedAt: { type: Date, required: true },
                verification: {
                    status: {
                        type: String,
                        enum: ["pending", "approved", "rejected"],
                        default: "pending",
                    },
                    reason: { type: String },
                    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
                    reviewedAt: { type: Date },
                },
            },
            default: null,
            _id: false,
        },
    },
    {
        timestamps:true, //autocreatedAt and updatedAt
    }
)

export interface IUser extends UserType,Document{
    _id: mongoose.Types.ObjectId;
    createdAt:Date;
    updatedAt:Date;
}

export const UserModel =mongoose.model<IUser>('User',userSchema);
//collection name "users" (plural of "User")
//UserModel -> db.users
