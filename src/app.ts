import express , { Application, Request, Response } from 'express';

import { connectDB } from './database/mongodb';
import bodyParser from 'body-parser';
import { PORT } from './config';

import authRoutes from './routes/auth.route';
import jobRoutes from './routes/job.route';
import adminRoutes from './routes/admin.route';
// import adminUserRoute from './routes/admin/user.route';
// import adminItemRoute from './routes/admin/item.route';
// import adminPaymentRoute from './routes/admin/payment.route';
// import itemRoutes from './routes/item.route';
// import paymentRoutes from './routes/payment.route';
// import cartRoutes from './routes/cart.route';
// import notificationRoutes from './routes/notification.route';
// import adminNotificationRoute from './routes/admin/notification.route';
// import paymentController from './controllers/payment.controller';

import cors from "cors";
import path from "path";
import { notFoundHandler, errorHandler } from './middleware/error-handler.middleware';




// dotenv.config();

const app: Application = express();
// const PORT: number = 3000;
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  })
);

// Stripe webhook needs raw body for signature verification — register before JSON parser
// app.post(
//   '/api/payments/stripe/webhook',
//   express.raw({ type: 'application/json' }),
//   (req: Request, res: Response) => paymentController.handleStripeWebhook(req, res)
// );

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use("/api/users", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);
app.use("/upload", express.static(path.join(process.cwd(), "upload")));
app.use("/admin", express.static(path.join(process.cwd(), "admin-panel")));
app.get("/uploads/:filename", (req: Request, res: Response) => {
  const filename = Array.isArray(req.params.filename)
    ? req.params.filename[0]
    : req.params.filename;
  res.sendFile(path.join(process.cwd(), "uploads", path.basename(filename)));
});


app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

 
app.use('/api/auth', authRoutes);
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

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
// Ensure CommonJS consumers can require the Express app
(module as any).exports = app;
