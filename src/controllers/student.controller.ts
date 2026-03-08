import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";
import { hashPassword } from "../utils/password";
import { sendWelcomeEmail } from "../services/email.service";

export const createStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      classId,
      guardianId,
      admissionNumber,
      rollNumber,
      category,
      religion,
      bloodGroup,
      address,
      totalFeesRequired,
    } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    // Check if email already exists
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ message: "Email already registered" });
        return;
      }
    }

    // Check if admission number exists in school
    if (admissionNumber) {
      const existingStudent = await prisma.student.findFirst({
        where: {
          schoolId,
          admissionNumber,
        },
      });

      if (existingStudent) {
        res.status(409).json({
          message: "Admission number already exists in this school",
        });
        return;
      }
    }

    // Create user and student in a transaction
    const hashedPassword = password ? await hashPassword(password) : await hashPassword("student123");

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phone,
          role: "STUDENT",
          schoolId,
        },
      });

      // Get class to determine fees if not provided
      const classData = await tx.class.findUnique({
        where: { id: classId },
        select: { feesAmount: true },
      });

      const newStudent = await tx.student.create({
        data: {
          userId: user.id,
          schoolId,
          classId,
          guardianId,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          admissionNumber,
          rollNumber,
          category,
          religion,
          bloodGroup,
          address,
          totalFeesRequired: totalFeesRequired
            ? parseFloat(totalFeesRequired)
            : Number(classData?.feesAmount || 0),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          class: true,
          guardian: true,
          _count: {
            select: { payments: true },
          },
        },
      });

      return newStudent;
    });

    // Send welcome email (non-blocking)
    if (email) {
      try {
        await sendWelcomeEmail(
          email,
          `${firstName} ${lastName}`,
          password || "student123"
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Failed to create student" });
  }
};

export const getAllStudents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, classId, suspended } = req.query;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (classId) {
      where.classId = classId;
    }

    if (suspended !== undefined) {
      where.isSuspended = suspended === "true";
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search as string, mode: "insensitive" } } },
        { user: { lastName: { contains: search as string, mode: "insensitive" } } },
        { user: { email: { contains: search as string, mode: "insensitive" } } },
        { admissionNumber: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          class: true,
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              relationship: true,
            },
          },
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

export const getStudentById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        class: true,
        guardian: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 10,
        },
        examResults: {
          include: {
            exam: true,
            subject: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Calculate financial summary
    const totalPaid = student.payments.reduce(
      (sum: number, payment) => sum + Number(payment.amount),
      0
    );
    const totalFees = Number(student.totalFeesRequired || 0);
    const balance = totalFees - totalPaid;

    const studentWithFinancials = {
      ...student,
      financialSummary: {
        totalFees,
        totalPaid,
        balance,
      },
    };

    res.status(200).json({
      success: true,
      data: studentWithFinancials,
    });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ message: "Failed to fetch student" });
  }
};

export const updateStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      classId,
      guardianId,
      admissionNumber,
      category,
      religion,
      bloodGroup,
      photo,
      address,
    } = req.body;

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStudent) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Update student and user in transaction
    const student = await prisma.$transaction(async (tx) => {
      // Update user table
      await tx.user.update({
        where: { id: existingStudent.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
        },
      });

      // Update student table
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          ...(dateOfBirth !== undefined && { dateOfBirth }),
          ...(gender && { gender }),
          ...(classId && { classId }),
          ...(guardianId !== undefined && { guardianId }),
          ...(admissionNumber && { admissionNumber }),
          ...(category !== undefined && { category }),
          ...(religion !== undefined && { religion }),
          ...(bloodGroup !== undefined && { bloodGroup }),
          ...(photo !== undefined && { photo }),
          ...(address !== undefined && { address }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          class: true,
          guardian: true,
        },
      });

      return updatedStudent;
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Failed to update student" });
  }
};

export const deleteStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Delete student and user in transaction
    await prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: { id },
      });

      await tx.user.delete({
        where: { id: student.userId },
      });
    });

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

export const suspendStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { suspensionReason } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Suspend student and deactivate user account
    const updatedStudent = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data: { isActive: false },
      });

      return await tx.student.update({
        where: { id },
        data: {
          isSuspended: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Student suspended successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Suspend student error:", error);
    res.status(500).json({ message: "Failed to suspend student" });
  }
};

export const activateStudent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Activate student and reactivate user account
    const updatedStudent = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data: { isActive: true },
      });

      return await tx.student.update({
        where: { id },
        data: {
          isSuspended: false,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: "Student activated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Activate student error:", error);
    res.status(500).json({ message: "Failed to activate student" });
  }
};
