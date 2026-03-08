import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, code, description, level } = req.body;
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const existingSubject = await prisma.subject.findFirst({
      where: { schoolId, code },
    });

    if (existingSubject) {
      res.status(409).json({ message: "Subject code already exists in this school" });
      return;
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        description,
        level,
        schoolId,
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Create subject error:", error);
    res.status(500).json({ message: "Failed to create subject" });
  }
};

export const getAllSubjects = async (
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
        { code: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.subject.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        subjects,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
};

export const getSubjectById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            class: true,
            teacher: {
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
          },
        },
      },
    });

    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Get subject error:", error);
    res.status(500).json({ message: "Failed to fetch subject" });
  }
};

export const updateSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, level } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description }),
        ...(level && { level }),
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Update subject error:", error);
    res.status(500).json({ message: "Failed to update subject" });
  }
};

export const deleteSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const assignmentCount = await prisma.subjectAssignment.count({
      where: { subjectId: id },
    });

    if (assignmentCount > 0) {
      res.status(400).json({
        message: "Cannot delete subject with class assignments"
      });
      return;
    }

    await prisma.subject.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Delete subject error:", error);
    res.status(500).json({ message: "Failed to delete subject" });
  }
};

export const assignSubjectToClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { subjectId, classId, teacherId } = req.body;

    const existingAssignment = await prisma.subjectAssignment.findFirst({
      where: { subjectId, classId },
    });

    if (existingAssignment) {
      res.status(409).json({ message: "Subject already assigned to this class" });
      return;
    }

    const assignment = await prisma.subjectAssignment.create({
      data: {
        subjectId,
        classId,
        teacherId,
      },
      include: {
        subject: true,
        class: true,
        teacher: {
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
      },
    });

    res.status(201).json({
      success: true,
      message: "Subject assigned successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Assign subject error:", error);
    res.status(500).json({ message: "Failed to assign subject" });
  }
};

export const updateSubjectAssignment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    const assignment = await prisma.subjectAssignment.update({
      where: { id },
      data: {
        ...(teacherId !== undefined && { teacherId }),
      },
      include: {
        subject: true,
        class: true,
        teacher: {
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
      },
    });

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ message: "Failed to update assignment" });
  }
};

export const deleteSubjectAssignment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.subjectAssignment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ message: "Failed to delete assignment" });
  }
};
