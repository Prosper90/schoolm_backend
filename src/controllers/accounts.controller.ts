import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

// Income Head Management
export const createIncomeHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body;

    const schoolId =
      req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const incomeHead = await prisma.incomeHead.create({
      data: {
        name,
        description,
        schoolId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Income head created successfully",
      data: incomeHead,
    });
  } catch (error) {
    console.error("Create income head error:", error);
    res.status(500).json({ message: "Failed to create income head" });
  }
};

export const getAllIncomeHeads = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const schoolId =
      req.user?.role === "SUPER_ADMIN"
        ? (req.query.schoolId as string)
        : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const incomeHeads = await prisma.incomeHead.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      data: incomeHeads,
    });
  } catch (error) {
    console.error("Get income heads error:", error);
    res.status(500).json({ message: "Failed to fetch income heads" });
  }
};

export const updateIncomeHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const incomeHead = await prisma.incomeHead.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Income head updated successfully",
      data: incomeHead,
    });
  } catch (error) {
    console.error("Update income head error:", error);
    res.status(500).json({ message: "Failed to update income head" });
  }
};

export const deleteIncomeHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.incomeHead.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Income head deleted successfully",
    });
  } catch (error) {
    console.error("Delete income head error:", error);
    res.status(500).json({ message: "Failed to delete income head" });
  }
};

// Expense Head Management
export const createExpenseHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body;

    const schoolId =
      req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const expenseHead = await prisma.expenseHead.create({
      data: {
        name,
        description,
        schoolId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Expense head created successfully",
      data: expenseHead,
    });
  } catch (error) {
    console.error("Create expense head error:", error);
    res.status(500).json({ message: "Failed to create expense head" });
  }
};

export const getAllExpenseHeads = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const schoolId =
      req.user?.role === "SUPER_ADMIN"
        ? (req.query.schoolId as string)
        : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const expenseHeads = await prisma.expenseHead.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      data: expenseHeads,
    });
  } catch (error) {
    console.error("Get expense heads error:", error);
    res.status(500).json({ message: "Failed to fetch expense heads" });
  }
};

export const updateExpenseHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const expenseHead = await prisma.expenseHead.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Expense head updated successfully",
      data: expenseHead,
    });
  } catch (error) {
    console.error("Update expense head error:", error);
    res.status(500).json({ message: "Failed to update expense head" });
  }
};

export const deleteExpenseHead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.expenseHead.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Expense head deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense head error:", error);
    res.status(500).json({ message: "Failed to delete expense head" });
  }
};

// Income Management
export const recordIncome = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { incomeHeadId, amount, date, description, invoiceNumber } = req.body;

    const schoolId =
      req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const income = await prisma.income.create({
      data: {
        incomeHeadId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        invoiceNumber,
        schoolId,
      },
      include: {
        incomeHead: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Income recorded successfully",
      data: income,
    });
  } catch (error) {
    console.error("Record income error:", error);
    res.status(500).json({ message: "Failed to record income" });
  }
};

export const getAllIncome = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      incomeHeadId,
      startDate,
      endDate,
    } = req.query;

    const schoolId =
      req.user?.role === "SUPER_ADMIN"
        ? (req.query.schoolId as string)
        : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (incomeHeadId) {
      where.incomeHeadId = incomeHeadId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          incomeHead: true,
        },
        orderBy: { date: "desc" },
      }),
      prisma.income.count({ where }),
    ]);

    // Calculate total income
    const totalIncome = await prisma.income.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        incomes,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
        summary: {
          totalIncome: totalIncome._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get income error:", error);
    res.status(500).json({ message: "Failed to fetch income" });
  }
};

export const getIncomeById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const income = await prisma.income.findUnique({
      where: { id },
      include: {
        incomeHead: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!income) {
      res.status(404).json({ message: "Income record not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: income,
    });
  } catch (error) {
    console.error("Get income error:", error);
    res.status(500).json({ message: "Failed to fetch income" });
  }
};

export const updateIncome = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { incomeHeadId, amount, date, description, invoiceNumber } = req.body;

    const income = await prisma.income.update({
      where: { id },
      data: {
        ...(incomeHeadId && { incomeHeadId }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
      },
      include: {
        incomeHead: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Income updated successfully",
      data: income,
    });
  } catch (error) {
    console.error("Update income error:", error);
    res.status(500).json({ message: "Failed to update income" });
  }
};

export const deleteIncome = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.income.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    console.error("Delete income error:", error);
    res.status(500).json({ message: "Failed to delete income" });
  }
};

// Expense Management
export const recordExpense = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { expenseHeadId, amount, date, description, invoiceNumber } =
      req.body;

    const schoolId =
      req.user?.role === "SUPER_ADMIN" ? req.body.schoolId : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        expenseHeadId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        invoiceNumber,
        schoolId,
      },
      include: {
        expenseHead: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Record expense error:", error);
    res.status(500).json({ message: "Failed to record expense" });
  }
};

export const getAllExpenses = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      expenseHeadId,
      startDate,
      endDate,
    } = req.query;

    const schoolId =
      req.user?.role === "SUPER_ADMIN"
        ? (req.query.schoolId as string)
        : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (expenseHeadId) {
      where.expenseHeadId = expenseHeadId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          expenseHead: true,
        },
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    // Calculate total expense
    const totalExpense = await prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
        summary: {
          totalExpense: totalExpense._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

export const getExpenseById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        expenseHead: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!expense) {
      res.status(404).json({ message: "Expense record not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);
    res.status(500).json({ message: "Failed to fetch expense" });
  }
};

export const updateExpense = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { expenseHeadId, amount, date, description, invoiceNumber } =
      req.body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(expenseHeadId && { expenseHeadId }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
      },
      include: {
        expenseHead: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
};

export const deleteExpense = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.expense.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
};

// Financial Report
export const getFinancialReport = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const schoolId =
      req.user?.role === "SUPER_ADMIN"
        ? (req.query.schoolId as string)
        : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const where: any = { schoolId };
    const dateFilter: any = {};

    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate as string);
      }
    }

    // Get income data
    const [totalIncome, incomeByHead] = await Promise.all([
      prisma.income.aggregate({
        where: {
          ...where,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.income.groupBy({
        by: ["incomeHeadId"],
        where: {
          ...where,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get expense data
    const [totalExpense, expenseByHead] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...where,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({
        by: ["expenseHeadId"],
        where: {
          ...where,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get income head details
    const incomeHeadIds = incomeByHead.map((i) => i.incomeHeadId);
    const incomeHeads = await prisma.incomeHead.findMany({
      where: { id: { in: incomeHeadIds } },
    });

    const incomeBreakdown = incomeByHead.map((i) => {
      const head = incomeHeads.find((h) => h.id === i.incomeHeadId);
      return {
        name: head?.name || "Unknown",
        amount: i._sum.amount || 0,
        count: i._count,
      };
    });

    // Get expense head details
    const expenseHeadIds = expenseByHead.map((e) => e.expenseHeadId);
    const expenseHeads = await prisma.expenseHead.findMany({
      where: { id: { in: expenseHeadIds } },
    });

    const expenseBreakdown = expenseByHead.map((e) => {
      const head = expenseHeads.find((h) => h.id === e.expenseHeadId);
      return {
        name: head?.name || "Unknown",
        amount: e._sum.amount || 0,
        count: e._count,
      };
    });

    const totalIncomeAmount = Number(totalIncome._sum.amount || 0);
    const totalExpenseAmount = Number(totalExpense._sum.amount || 0);
    const netProfit = totalIncomeAmount - totalExpenseAmount;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalIncome: totalIncomeAmount,
          totalExpense: totalExpenseAmount,
          netProfit,
          incomeTransactions: totalIncome._count,
          expenseTransactions: totalExpense._count,
        },
        incomeBreakdown,
        expenseBreakdown,
      },
    });
  } catch (error) {
    console.error("Get financial report error:", error);
    res.status(500).json({ message: "Failed to generate financial report" });
  }
};
