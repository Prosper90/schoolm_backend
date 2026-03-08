import express from "express";
import { body } from "express-validator";
import {
  createIncomeHead,
  getAllIncomeHeads,
  updateIncomeHead,
  deleteIncomeHead,
  createExpenseHead,
  getAllExpenseHeads,
  updateExpenseHead,
  deleteExpenseHead,
  recordIncome,
  getAllIncome,
  getIncomeById,
  updateIncome,
  deleteIncome,
  recordExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getFinancialReport,
} from "../controllers/accounts.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import { UserRole } from "../generated/prisma";

const router = express.Router();

const createHeadValidation = [
  body("name").notEmpty().withMessage("Name is required"),
];

const recordTransactionValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
];

// Income Heads
router.post(
  "/income-heads",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  validate(createHeadValidation),
  createIncomeHead,
);

router.get(
  "/income-heads",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getAllIncomeHeads,
);

router.put(
  "/income-heads/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  updateIncomeHead,
);

router.delete(
  "/income-heads/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteIncomeHead,
);

// Expense Heads
router.post(
  "/expense-heads",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  validate(createHeadValidation),
  createExpenseHead,
);

router.get(
  "/expense-heads",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getAllExpenseHeads,
);

router.put(
  "/expense-heads/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  updateExpenseHead,
);

router.delete(
  "/expense-heads/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteExpenseHead,
);

// Income
router.post(
  "/income",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  validate([
    ...recordTransactionValidation,
    body("incomeHeadId").notEmpty().withMessage("Income head is required"),
  ]),
  recordIncome,
);

router.get(
  "/income",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getAllIncome,
);

router.get(
  "/income/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getIncomeById,
);

router.put(
  "/income/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  updateIncome,
);

router.delete(
  "/income/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteIncome,
);

// Expenses
router.post(
  "/expenses",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  validate([
    ...recordTransactionValidation,
    body("expenseHeadId").notEmpty().withMessage("Expense head is required"),
  ]),
  recordExpense,
);

router.get(
  "/expenses",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getAllExpenses,
);

router.get(
  "/expenses/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getExpenseById,
);

router.put(
  "/expenses/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  updateExpense,
);

router.delete(
  "/expenses/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN),
  deleteExpense,
);

// Financial Report
router.get(
  "/report",
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT),
  getFinancialReport,
);

export default router;
