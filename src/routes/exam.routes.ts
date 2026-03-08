import express from "express";
import { body } from "express-validator";
import {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  scheduleExam,
  getExamSchedules,
  updateExamSchedule,
  deleteExamSchedule,
  recordExamResult,
  bulkRecordExamResults,
  getStudentExamResults,
  getExamResults,
  deleteExamResult,
} from "../controllers/exam.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createExamValidation = [
  body("name").notEmpty().withMessage("Exam name is required"),
  body("term").notEmpty().withMessage("Term is required"),
  body("academicYear").notEmpty().withMessage("Academic year is required"),
];

const scheduleExamValidation = [
  body("examId").notEmpty().withMessage("Exam ID is required"),
  body("classId").notEmpty().withMessage("Class ID is required"),
  body("subjectId").notEmpty().withMessage("Subject ID is required"),
  body("examDate").notEmpty().withMessage("Exam date is required"),
  body("startTime").notEmpty().withMessage("Start time is required"),
  body("endTime").notEmpty().withMessage("End time is required"),
];

const recordResultValidation = [
  body("examId").notEmpty().withMessage("Exam ID is required"),
  body("studentId").notEmpty().withMessage("Student ID is required"),
  body("subjectId").notEmpty().withMessage("Subject ID is required"),
  body("marksObtained").isFloat({ min: 0 }).withMessage("Marks obtained must be a positive number"),
];

const bulkResultValidation = [
  body("examId").notEmpty().withMessage("Exam ID is required"),
  body("results").isArray().withMessage("Results must be an array"),
  body("results.*.studentId").notEmpty().withMessage("Student ID is required"),
  body("results.*.subjectId").notEmpty().withMessage("Subject ID is required"),
  body("results.*.marksObtained").isFloat({ min: 0 }).withMessage("Marks obtained must be a positive number"),
];

// Exam CRUD
router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createExamValidation),
  createExam
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAllExams
);

router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getExamById
);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateExam
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteExam
);

// Exam Scheduling
router.post(
  "/schedules",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(scheduleExamValidation),
  scheduleExam
);

router.get(
  "/schedules/list",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getExamSchedules
);

router.put(
  "/schedules/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateExamSchedule
);

router.delete(
  "/schedules/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteExamSchedule
);

// Exam Results
router.post(
  "/results",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(recordResultValidation),
  recordExamResult
);

router.post(
  "/results/bulk",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(bulkResultValidation),
  bulkRecordExamResults
);

router.get(
  "/results/student/:studentId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getStudentExamResults
);

router.get(
  "/results/list",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getExamResults
);

router.delete(
  "/results/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteExamResult
);

export default router;
