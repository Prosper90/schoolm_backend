import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = express.Router();

const registerValidation = [
  body("schoolName").notEmpty().withMessage("School name is required"),
  body("schoolEmail").isEmail().withMessage("Valid school email is required"),
  body("schoolPhone").notEmpty().withMessage("School phone is required"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid admin email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").notEmpty().withMessage("Email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", validate(registerValidation), register);
router.post("/login", validate(loginValidation), login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticate, logout);
router.get("/profile", authenticate, getProfile);

export default router;
