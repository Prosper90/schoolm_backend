import express from "express";
import { body } from "express-validator";
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
} from "../controllers/staff.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createStaffValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("position").notEmpty().withMessage("Position is required"),
  body("dateHired").notEmpty().withMessage("Date hired is required"),
];

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createStaffValidation),
  createStaff,
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAllStaff,
);

router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getStaffById,
);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateStaff,
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteStaff,
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  toggleStaffStatus,
);

export default router;
