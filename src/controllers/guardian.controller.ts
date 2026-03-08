import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createGuardian = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, occupation, address, relationship, photo } = req.body;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const guardian = await prisma.guardian.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        occupation,
        address,
        relationship,
        photo,
        schoolId,
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Guardian created successfully",
      data: guardian,
    });
  } catch (error) {
    console.error("Create guardian error:", error);
    res.status(500).json({ message: "Failed to create guardian" });
  }
};

export const getAllGuardians = async (
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
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [guardians, total] = await Promise.all([
      prisma.guardian.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: { students: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.guardian.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        guardians,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get guardians error:", error);
    res.status(500).json({ message: "Failed to fetch guardians" });
  }
};

export const getGuardianById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const guardian = await prisma.guardian.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        students: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            class: true,
          },
        },
      },
    });

    if (!guardian) {
      res.status(404).json({ message: "Guardian not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: guardian,
    });
  } catch (error) {
    console.error("Get guardian error:", error);
    res.status(500).json({ message: "Failed to fetch guardian" });
  }
};

export const updateGuardian = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, occupation, address, relationship, photo } = req.body;

    const guardian = await prisma.guardian.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone && { phone }),
        ...(occupation !== undefined && { occupation }),
        ...(address !== undefined && { address }),
        ...(relationship && { relationship }),
        ...(photo !== undefined && { photo }),
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Guardian updated successfully",
      data: guardian,
    });
  } catch (error) {
    console.error("Update guardian error:", error);
    res.status(500).json({ message: "Failed to update guardian" });
  }
};

export const deleteGuardian = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const studentCount = await prisma.student.count({
      where: { guardianId: id },
    });

    if (studentCount > 0) {
      res.status(400).json({
        message: "Cannot delete guardian with linked students"
      });
      return;
    }

    await prisma.guardian.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Guardian deleted successfully",
    });
  } catch (error) {
    console.error("Delete guardian error:", error);
    res.status(500).json({ message: "Failed to delete guardian" });
  }
};
