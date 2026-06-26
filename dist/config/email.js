"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const process_1 = __importDefault(require("process"));
const EMAIL_PASS = process_1.default.env.EMAIL_PASS;
const EMAIL_USER = process_1.default.env.EMAIL_USER;
exports.transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});
const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: `Recell Bazar <${EMAIL_USER}>`,
        to,
        subject,
        html,
    };
    await exports.transporter.sendMail(mailOptions);
};
exports.sendEmail = sendEmail;
