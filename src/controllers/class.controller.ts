import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, grade, stream, level, classTeacherId, capacity, feesAmount } = req.body;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const existingClass = await prisma.class.findFirst({
      where: { schoolId, name, stream: stream || null },
    });

    if (existingClass) {
      res.status(409).json({ message: "Class with this name and stream already exists" });
      return;
    }

    const classData = await prisma.class.create({
      data: {
        name,
        grade: parseInt(grade),
        stream,
        level,
        schoolId,
        classTeacherId,
        capacity: capacity ? parseInt(capacity) : 40,
        feesAmount: parseFloat(feesAmount),
      },
      include: {
        classTeacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: classData,
    });
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({ message: "Failed to create class" });
  }
};

export const getAllClasses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, level } = req.query;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (level) {
      where.level = level;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { stream: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          classTeacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              students: true,
              subjects: true,
            },
          },
        },
        orderBy: [{ level: "asc" }, { grade: "asc" }, { stream: "asc" }],
      }),
      prisma.class.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        classes,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get classes error:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
};

export const getClassById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        classTeacher: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
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
        students: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 100,
        },
        subjects: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
    });

    if (!classData) {
      res.status(404).json({ message: "Class not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    console.error("Get class error:", error);
    res.status(500).json({ message: "Failed to fetch class" });
  }
};

export const updateClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, grade, stream, level, classTeacherId, capacity, feesAmount } = req.body;

    const classData = await prisma.class.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(grade && { grade: parseInt(grade) }),
        ...(stream !== undefined && { stream }),
        ...(level && { level }),
        ...(classTeacherId !== undefined && { classTeacherId }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(feesAmount && { feesAmount: parseFloat(feesAmount) }),
      },
      include: {
        classTeacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            subjects: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: classData,
    });
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({ message: "Failed to update class" });
  }
};

export const deleteClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const studentCount = await prisma.student.count({
      where: { classId: id },
    });

    if (studentCount > 0) {
      res.status(400).json({
        message: "Cannot delete class with enrolled students"
      });
      return;
    }

    await prisma.class.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({ message: "Failed to delete class" });
  }
};
