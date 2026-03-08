import express from "express";
import { body } from "express-validator";
import {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getAllBookIssues,
  getStudentBookIssues,
  getLibraryReport,
} from "../controllers/library.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const addBookValidation = [
  body("title").notEmpty().withMessage("Book title is required"),
  body("author").notEmpty().withMessage("Author is required"),
  body("isbn").notEmpty().withMessage("ISBN is required"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const issueBookValidation = [
  body("bookId").notEmpty().withMessage("Book ID is required"),
  body("studentId").notEmpty().withMessage("Student ID is required"),
  body("dueDate").notEmpty().withMessage("Due date is required"),
];

// Books CRUD
router.post(
  "/books",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SECRETARY),
  validate(addBookValidation),
  addBook
);

router.get(
  "/books",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.SECRETARY),
  getAllBooks
);

router.get(
  "/books/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.SECRETARY),
  getBookById
);

router.put(
  "/books/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SECRETARY),
  updateBook
);

router.delete(
  "/books/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteBook
);

// Book Issues
router.post(
  "/issues",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SECRETARY),
  validate(issueBookValidation),
  issueBook
);

router.patch(
  "/issues/:id/return",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SECRETARY),
  returnBook
);

router.get(
  "/issues",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.SECRETARY),
  getAllBookIssues
);

router.get(
  "/issues/student/:studentId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.SECRETARY),
  getStudentBookIssues
);

// Reports
router.get(
  "/report",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.SECRETARY),
  getLibraryReport
);

export default router;
