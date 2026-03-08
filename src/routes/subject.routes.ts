import express from "express";
import { body } from "express-validator";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  assignSubjectToClass,
  updateSubjectAssignment,
  deleteSubjectAssignment,
} from "../controllers/subject.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createSubjectValidation = [
  body("name").notEmpty().withMessage("Subject name is required"),
  body("code").notEmpty().withMessage("Subject code is required"),
  body("level").notEmpty().withMessage("School level is required"),
];

const assignSubjectValidation = [
  body("subjectId").notEmpty().withMessage("Subject ID is required"),
  body("classId").notEmpty().withMessage("Class ID is required"),
  body("teacherId").notEmpty().withMessage("Teacher ID is required"),
];

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createSubjectValidation),
  createSubject,
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAllSubjects,
);

router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getSubjectById,
);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateSubject,
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteSubject,
);

router.post(
  "/assignments",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(assignSubjectValidation),
  assignSubjectToClass,
);

router.put(
  "/assignments/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateSubjectAssignment,
);

router.delete(
  "/assignments/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteSubjectAssignment,
);

export default router;
