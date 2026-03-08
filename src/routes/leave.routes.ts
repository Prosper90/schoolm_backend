import express from "express";
import { body } from "express-validator";
import {
  createLeaveType,
  getAllLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
  applyLeave,
  getAllLeaves,
  getMyLeaves,
  getLeaveById,
  updateLeaveStatus,
  cancelLeave,
  getLeaveReport,
} from "../controllers/leave.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createLeaveTypeValidation = [
  body("name").notEmpty().withMessage("Leave type name is required"),
];

const applyLeaveValidation = [
  body("startDate").notEmpty().withMessage("Start date is required"),
  body("endDate").notEmpty().withMessage("End date is required"),
  body("reason").notEmpty().withMessage("Reason is required"),
];

// Leave Types
router.post(
  "/types",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createLeaveTypeValidation),
  createLeaveType
);

router.get(
  "/types",
  authenticate,
  getAllLeaveTypes
);

router.put(
  "/types/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateLeaveType
);

router.delete(
  "/types/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteLeaveType
);

// Leave Applications
router.post(
  "/",
  authenticate,
  validate(applyLeaveValidation),
  applyLeave
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.ACCOUNTANT, UserRole.SECRETARY),
  getAllLeaves
);

router.get(
  "/my-leaves",
  authenticate,
  getMyLeaves
);

router.get(
  "/report",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  getLeaveReport
);

router.get(
  "/:id",
  authenticate,
  getLeaveById
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateLeaveStatus
);

router.delete(
  "/:id",
  authenticate,
  cancelLeave
);

export default router;
