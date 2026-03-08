import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createDepartment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, code } = req.body;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const existingDept = await prisma.department.findFirst({
      where: { schoolId, code },
    });

    if (existingDept) {
      res.status(409).json({ message: "Department code already exists in this school" });
      return;
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        schoolId,
      },
      include: {
        _count: {
          select: { staff: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ message: "Failed to create department" });
  }
};

export const getAllDepartments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search } = req.query;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { code: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: { staff: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.department.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        departments,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

export const getDepartmentById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: { staff: true },
        },
      },
    });

    if (!department) {
      res.status(404).json({ message: "Department not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("Get department error:", error);
    res.status(500).json({ message: "Failed to fetch department" });
  }
};

export const updateDepartment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
      },
      include: {
        _count: {
          select: { staff: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({ message: "Failed to update department" });
  }
};

export const deleteDepartment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const staffCount = await prisma.staff.count({
      where: { departmentId: id },
    });

    if (staffCount > 0) {
      res.status(400).json({
        message: "Cannot delete department with assigned staff members"
      });
      return;
    }

    await prisma.department.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({ message: "Failed to delete department" });
  }
};
