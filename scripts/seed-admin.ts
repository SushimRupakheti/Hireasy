import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { MONGO_URI } from "../src/config";
import { UserModel } from "../src/models/user.model";

dotenv.config();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@hireasy.local";
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const contactNo = process.env.ADMIN_CONTACT_NO || "9800000000";
  const address = process.env.ADMIN_ADDRESS || "Hireasy HQ";

  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required to seed an admin user");
  }

  await mongoose.connect(MONGO_URI);

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        role: "admin",
        status: "verified",
        firstName: "System",
        lastName: "Admin",
        email,
        contactNo,
        address,
        password: hashedPassword,
      },
    },
    { new: true, upsert: true, runValidators: true }
  ).select("-password");

  console.log(`Admin user ready: ${admin.email}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
