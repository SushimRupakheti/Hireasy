"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const job_route_1 = __importDefault(require("./routes/job.route"));
// import adminUserRoute from './routes/admin/user.route';
// import adminItemRoute from './routes/admin/item.route';
// import adminPaymentRoute from './routes/admin/payment.route';
// import itemRoutes from './routes/item.route';
// import paymentRoutes from './routes/payment.route';
// import cartRoutes from './routes/cart.route';
// import notificationRoutes from './routes/notification.route';
// import adminNotificationRoute from './routes/admin/notification.route';
// import paymentController from './controllers/payment.controller';
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
// dotenv.config();
const app = (0, express_1.default)();
// const PORT: number = 3000;
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
// Stripe webhook needs raw body for signature verification — register before JSON parser
// app.post(
//   '/api/payments/stripe/webhook',
//   express.raw({ type: 'application/json' }),
//   (req: Request, res: Response) => paymentController.handleStripeWebhook(req, res)
// );
app.use(express_1.default.json());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use("/api/users", auth_route_1.default);
app.use("/api/jobs", job_route_1.default);
app.use("/upload", express_1.default.static(path_1.default.join(process.cwd(), "upload")));
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.use('/api/auth', auth_route_1.default);
// app.use('/api/admin/users', adminUserRoute);
// app.use('/api/admin/items', adminItemRoute);
// app.use('/api/admin/payments', adminPaymentRoute);
// app.use('/api/admin/notifications', adminNotificationRoute);
// app.use("/uploads", express.static("uploads"));
// app.use("/api/items", itemRoutes);
// app.use("/api/payments", paymentRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/uploads", express.static(path.join(__dirname, "../itemPhotoUploads")));
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'API working' });
});
exports.default = app;
// Ensure CommonJS consumers can require the Express app
module.exports = app;
