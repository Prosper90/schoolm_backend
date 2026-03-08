import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { errorHandler, notFound } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import schoolRoutes from "./routes/school.routes";
import departmentRoutes from "./routes/department.routes";
import staffRoutes from "./routes/staff.routes";
import classRoutes from "./routes/class.routes";
import subjectRoutes from "./routes/subject.routes";
import guardianRoutes from "./routes/guardian.routes";
import studentRoutes from "./routes/student.routes";
import paymentRoutes from "./routes/payment.routes";
import attendanceRoutes from "./routes/attendance.routes";
import examRoutes from "./routes/exam.routes";
import leaveRoutes from "./routes/leave.routes";
import libraryRoutes from "./routes/library.routes";
import accountsRoutes from "./routes/accounts.routes";

dotenv.config();

const app: Application = express();

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.nodeEnv === "development" ? 1000 : config.rateLimit.maxRequests,
  message: "Too many requests from this IP, please try again later.",
});

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use("/api/", limiter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "School Management System API",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/guardians", guardianRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/accounts", accountsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
