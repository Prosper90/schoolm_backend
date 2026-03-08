import express from "express";
import { body } from "express-validator";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createDepartmentValidation = [
  body("name").notEmpty().withMessage("Department name is required"),
  body("code").notEmpty().withMessage("Department code is required"),
];

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createDepartmentValidation),
  createDepartment
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getAllDepartments
);

router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  getDepartmentById
);

router.put(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  updateDepartment
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteDepartment
);

export default router;
