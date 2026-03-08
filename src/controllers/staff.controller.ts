import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";
import { hashPassword } from "../utils/password";
import { UserRole } from "../generated/prisma";
import { sendWelcomeEmail } from "../services/email.service";

export const createStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      position,
      departmentId,
      dateHired,
      salary,
      qualification,
      experience,
    } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const staff = await prisma.staff.create({
      data: {
        position,
        ...(departmentId ? { department: { connect: { id: departmentId } } } : {}),
        dateHired: dateHired ? new Date(dateHired) : new Date(),
        salary: salary ? parseFloat(salary) : null,
        qualification: qualification || null,
        experience: experience ? String(experience) : null,
        user: {
          create: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: role || UserRole.TEACHER,
            schoolId,
          },
        },
        school: {
          connect: { id: schoolId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
          },
        },
        department: true,
      },
    });

    try {
      await sendWelcomeEmail(email, firstName, role || "Teacher");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Create staff error:", error);
    res.status(500).json({ message: "Failed to create staff member" });
  }
};

export const getAllStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, role, departmentId } = req.query;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (role) {
      where.user = { role: role as UserRole };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search as string, mode: "insensitive" } } },
        { user: { lastName: { contains: search as string, mode: "insensitive" } } },
        { user: { email: { contains: search as string, mode: "insensitive" } } },
        { position: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              avatar: true,
              isActive: true,
            },
          },
          department: true,
          _count: {
            select: {
              classesTeaching: true,
              subjectsTeaching: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.staff.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        staff,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
};

export const getStaffById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
            createdAt: true,
          },
        },
        department: true,
        school: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        classesTeaching: {
          include: {
            students: {
              select: {
                id: true,
              },
            },
          },
        },
        subjectsTeaching: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ message: "Failed to fetch staff member" });
  }
};

export const updateStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      position,
      departmentId,
      salary,
      qualification,
      experience,
    } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    const [updatedUser, updatedStaff] = await Promise.all([
      prisma.user.update({
        where: { id: staff.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
        },
      }),
      prisma.staff.update({
        where: { id },
        data: {
          ...(position && { position }),
          ...(departmentId !== undefined && {
            department: departmentId
              ? { connect: { id: departmentId } }
              : { disconnect: true },
          }),
          ...(salary && { salary: parseFloat(salary) }),
          ...(qualification && { qualification }),
          ...(experience !== undefined && { experience: experience ? String(experience) : null }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              avatar: true,
            },
          },
          department: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update staff error:", error);
    res.status(500).json({ message: "Failed to update staff member" });
  }
};

export const deleteStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            classesTeaching: true,
            subjectsTeaching: true,
          },
        },
      },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    if (staff._count.classesTeaching > 0 || staff._count.subjectsTeaching > 0) {
      res.status(400).json({
        message: "Cannot delete staff member with assigned classes or subjects"
      });
      return;
    }

    await prisma.staff.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({ message: "Failed to delete staff member" });
  }
};

export const toggleStaffStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: staff.userId },
      data: { isActive: !staff.user.isActive },
    });

    res.status(200).json({
      success: true,
      message: `Staff member ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: updatedUser.isActive },
    });
  } catch (error) {
    console.error("Toggle staff status error:", error);
    res.status(500).json({ message: "Failed to toggle staff status" });
  }
};
