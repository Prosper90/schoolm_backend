import express from "express";
import { body } from "express-validator";
import {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool,
  toggleSchoolStatus,
} from "../controllers/school.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createSchoolValidation = [
  body("name").notEmpty().withMessage("School name is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("level").notEmpty().withMessage("School level is required"),
  body("adminFirstName").notEmpty().withMessage("Admin first name is required"),
  body("adminLastName").notEmpty().withMessage("Admin last name is required"),
  body("adminEmail").isEmail().withMessage("Valid admin email is required"),
  body("adminPassword")
    .isLength({ min: 6 })
    .withMessage("Admin password must be at least 6 characters"),
];

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validate(createSchoolValidation),
  createSchool,
);

router.get("/", authenticate, authorize(UserRole.SUPER_ADMIN), getAllSchools);

router.get("/:id", authenticate, getSchoolById);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateSchool,
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  deleteSchool,
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  toggleSchoolStatus,
);

export default router;
