"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = exports.MONGO_URI = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.PORT = process.env.PORT ? parseInt(process.env.PORT) : 5050;
//ensure PORT is a number, and fallback if not found
//avoid exception if env is missing
exports.MONGO_URI = process.env.MONGO_URI || '';
//fallback to local mongo db if env is missing
//application lelevel constants
exports.JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';
