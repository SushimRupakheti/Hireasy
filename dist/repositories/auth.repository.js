"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_model_1 = require("../models/user.model");
class UserRepository {
    async createUser(data) {
        const newUser = new user_model_1.UserModel(data);
        await newUser.save(); // same as db.users.insertOne()
        return newUser;
    }
    async getUserByEmail(email) {
        const user = await user_model_1.UserModel.findOne({ "email": email });
        return user;
    }
    async getUserById(id) {
        const user = await user_model_1.UserModel.findById(id);
        return user;
    }
    async getAllUsers() {
        const users = await user_model_1.UserModel.find();
        return users;
    }
    async updateUserById(id, data) {
        // UserModel.updateOne({ _id: id }, data);
        const updatedUser = await user_model_1.UserModel.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        return updatedUser;
    }
    async deleteUserById(id) {
        // UserModel.deleteOne({ _id: id });
        const result = await user_model_1.UserModel.findByIdAndDelete(id);
        return result ? true : false;
    }
}
exports.UserRepository = UserRepository;
