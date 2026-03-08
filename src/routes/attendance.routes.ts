import express from "express";
import { body } from "express-validator";
import {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByClass,
  getStudentAttendance,
  getAttendanceReport,
  deleteAttendance,
} from "../controllers/attendance.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const markAttendanceValidation = [
  body("studentId").notEmpty().withMessage("Student ID is required"),
  body("status").isIn(["PRESENT", "ABSENT", "LATE"]).withMessage("Invalid status"),
];

const bulkMarkAttendanceValidation = [
  body("attendanceRecords").isArray().withMessage("Attendance records must be an array"),
  body("attendanceRecords.*.studentId").notEmpty().withMessage("Student ID is required"),
  body("attendanceRecords.*.status").isIn(["PRESENT", "ABSENT", "LATE"]).withMessage("Invalid status"),
];

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(markAttendanceValidation),
  markAttendance
);

router.post(
  "/bulk",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(bulkMarkAttendanceValidation),
  bulkMarkAttendance
);

router.get(
  "/class/:classId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAttendanceByClass
);

router.get(
  "/student/:studentId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getStudentAttendance
);

router.get(
  "/report",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAttendanceReport
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteAttendance
);

export default router;
