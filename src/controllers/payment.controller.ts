import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";
import { sendPaymentConfirmationEmail } from "../services/email.service";

export const recordPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      studentId,
      amount,
      paymentMethod,
      term,
      academicYear,
      notes,
    } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    // Verify student exists and belongs to the school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        user: true,
        class: true,
        guardian: true,
      },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || "Cash",
        term,
        academicYear,
        receiptNumber,
        notes,
        recordedBy: req.user?.userId || "system",
        schoolId,
      },
      include: {
        student: {
          include: {
            user: true,
            class: true,
          },
        },
      },
    });

    // Send payment confirmation email (non-blocking)
    const parentEmail = student.guardian?.email || student.user.email;
    const parentName = student.guardian
      ? `${student.guardian.firstName} ${student.guardian.lastName}`
      : `${student.user.firstName} ${student.user.lastName}`;

    if (parentEmail) {
      try {
        await sendPaymentConfirmationEmail(
          parentEmail,
          parentName,
          `${student.user.firstName} ${student.user.lastName}`,
          amount.toString(),
          receiptNumber
        );
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({ message: "Failed to record payment" });
  }
};

export const getAllPayments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      studentId,
      paymentMethod,
      startDate,
      endDate,
    } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (studentId) {
      where.studentId = studentId;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              class: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    // Calculate total amount
    const totalAmount = await prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
        summary: {
          totalAmount: totalAmount._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

export const getPaymentById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            class: true,
            guardian: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({ message: "Failed to fetch payment" });
  }
};

export const updatePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionId, paymentFor, description } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(paymentMethod && { paymentMethod }),
        ...(transactionId !== undefined && { transactionId }),
        ...(paymentFor && { paymentFor }),
        ...(description !== undefined && { description }),
      },
      include: {
        student: {
          include: {
            user: true,
            class: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({ message: "Failed to update payment" });
  }
};

export const deletePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.payment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Delete payment error:", error);
    res.status(500).json({ message: "Failed to delete payment" });
  }
};

export const getStudentPaymentHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { page = "1", limit = "20" } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    // Verify student exists
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        user: true,
        class: true,
      },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { studentId },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where: { studentId } }),
    ]);

    // Calculate financial summary
    const totalPaid = await prisma.payment.aggregate({
      where: { studentId },
      _sum: { amount: true },
    });

    const totalFees = Number(student.class?.feesAmount || 0);
    const balance = totalFees - Number(totalPaid._sum.amount || 0);

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          class: student.class?.name,
          admissionNumber: student.admissionNumber,
        },
        payments,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
        financialSummary: {
          totalFees,
          totalPaid: Number(totalPaid._sum.amount || 0),
          balance,
        },
      },
    });
  } catch (error) {
    console.error("Get student payment history error:", error);
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
};

export const getPaymentReport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, classId } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const where: any = { schoolId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    if (classId) {
      where.student = {
        classId: classId as string,
      };
    }

    // Get payment statistics
    const [totalPayments, paymentsByMethod, recentPayments] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              class: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Get students with outstanding balances
    const studentsWithBalances = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classId && { classId: classId as string }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
            feesAmount: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
    });

    const studentsWithOutstanding = studentsWithBalances
      .map((student) => {
        const totalPaid = student.payments.reduce((sum: number, p) => sum + Number(p.amount), 0);
        const totalFees = Number(student.class?.feesAmount || 0);
        const balance = totalFees - totalPaid;

        return {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          class: student.class?.name,
          totalFees,
          totalPaid,
          balance,
        };
      })
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAmount: totalPayments._sum.amount || 0,
          totalTransactions: totalPayments._count,
          byPaymentMethod: paymentsByMethod.map((p) => ({
            method: p.paymentMethod,
            amount: p._sum.amount || 0,
            count: p._count,
          })),
        },
        recentPayments,
        studentsWithOutstanding,
      },
    });
  } catch (error) {
    console.error("Get payment report error:", error);
    res.status(500).json({ message: "Failed to generate payment report" });
  }
};
