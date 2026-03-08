import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, term, academicYear, startDate, endDate, classId } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        term,
        academicYear,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        schoolId,
        ...(classId && { classId }),
      },
      include: {
        class: true,
        _count: {
          select: {
            schedules: true,
            results: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Create exam error:", error);
    res.status(500).json({ message: "Failed to create exam" });
  }
};

export const getAllExams = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", term, academicYear } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (term) {
      where.term = term;
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: {
              schedules: true,
              results: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.exam.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        exams,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get exams error:", error);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
};

export const getExamById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        schedules: {
          include: {
            subject: true,
          },
          orderBy: { date: "asc" },
        },
        results: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            subject: true,
          },
          take: 10,
          orderBy: { marksObtained: "desc" },
        },
      },
    });

    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error("Get exam error:", error);
    res.status(500).json({ message: "Failed to fetch exam" });
  }
};

export const updateExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, term, academicYear, startDate, endDate, classId } = req.body;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(term && { term }),
        ...(academicYear && { academicYear }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(classId !== undefined && { classId }),
      },
      include: {
        _count: {
          select: {
            schedules: true,
            results: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Update exam error:", error);
    res.status(500).json({ message: "Failed to update exam" });
  }
};

export const deleteExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if exam has results
    const resultsCount = await prisma.examResult.count({
      where: { examId: id },
    });

    if (resultsCount > 0) {
      res.status(400).json({
        message: "Cannot delete exam with recorded results",
      });
      return;
    }

    await prisma.exam.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Delete exam error:", error);
    res.status(500).json({ message: "Failed to delete exam" });
  }
};

export const scheduleExam = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { examId, subjectId, date, startTime, endTime, room } = req.body;

    const schedule = await prisma.examSchedule.create({
      data: {
        examId,
        subjectId,
        date: new Date(date),
        startTime,
        endTime,
        room,
      },
      include: {
        exam: {
          include: {
            class: true,
          },
        },
        subject: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Exam scheduled successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Schedule exam error:", error);
    res.status(500).json({ message: "Failed to schedule exam" });
  }
};

export const getExamSchedules = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { examId, startDate, endDate } = req.query;

    const where: any = {};

    if (examId) {
      where.examId = examId;
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

    const schedules = await prisma.examSchedule.findMany({
      where,
      include: {
        exam: {
          include: {
            class: true,
          },
        },
        subject: true,
      },
      orderBy: { date: "asc" },
    });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Get exam schedules error:", error);
    res.status(500).json({ message: "Failed to fetch exam schedules" });
  }
};

export const updateExamSchedule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, room } = req.body;

    const schedule = await prisma.examSchedule.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(room !== undefined && { room }),
      },
      include: {
        exam: {
          include: {
            class: true,
          },
        },
        subject: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Update exam schedule error:", error);
    res.status(500).json({ message: "Failed to update schedule" });
  }
};

export const deleteExamSchedule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.examSchedule.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("Delete exam schedule error:", error);
    res.status(500).json({ message: "Failed to delete schedule" });
  }
};

export const recordExamResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { examId, studentId, subjectId, marksObtained, totalMarks, grade, remarks } = req.body;

    // Verify exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      res.status(404).json({ message: "Exam not found" });
      return;
    }

    // Check if result already exists
    const existingResult = await prisma.examResult.findFirst({
      where: {
        examId,
        studentId,
        subjectId,
      },
    });

    if (existingResult) {
      // Update existing result
      const updated = await prisma.examResult.update({
        where: { id: existingResult.id },
        data: {
          marksObtained: parseInt(marksObtained),
          ...(totalMarks && { totalMarks: parseInt(totalMarks) }),
          grade,
          remarks,
        },
        include: {
          exam: true,
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          subject: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Exam result updated successfully",
        data: updated,
      });
      return;
    }

    // Create new result
    const result = await prisma.examResult.create({
      data: {
        examId,
        studentId,
        subjectId,
        marksObtained: parseInt(marksObtained),
        totalMarks: totalMarks ? parseInt(totalMarks) : 100,
        grade,
        remarks,
      },
      include: {
        exam: true,
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subject: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Exam result recorded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Record exam result error:", error);
    res.status(500).json({ message: "Failed to record exam result" });
  }
};

export const bulkRecordExamResults = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { examId, results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      res.status(400).json({ message: "Results array is required" });
      return;
    }

    // Process bulk results using upsert
    const processedResults = await prisma.$transaction(
      results.map((result) => {
        const { studentId, subjectId, marksObtained, totalMarks, grade, remarks } = result;

        return prisma.examResult.upsert({
          where: {
            examId_studentId_subjectId: {
              examId,
              studentId,
              subjectId,
            },
          },
          update: {
            marksObtained: parseInt(marksObtained),
            ...(totalMarks && { totalMarks: parseInt(totalMarks) }),
            grade,
            remarks,
          },
          create: {
            examId,
            studentId,
            subjectId,
            marksObtained: parseInt(marksObtained),
            totalMarks: totalMarks ? parseInt(totalMarks) : 100,
            grade,
            remarks,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      message: `Results recorded for ${processedResults.length} entries`,
      data: processedResults,
    });
  } catch (error) {
    console.error("Bulk record exam results error:", error);
    res.status(500).json({ message: "Failed to record bulk results" });
  }
};

export const getStudentExamResults = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { examId, academicYear, term } = req.query;

    const where: any = { studentId };

    if (examId) {
      where.examId = examId;
    }

    if (academicYear || term) {
      where.exam = {};
      if (academicYear) {
        where.exam.academicYear = academicYear;
      }
      if (term) {
        where.exam.term = term;
      }
    }

    const results = await prisma.examResult.findMany({
      where,
      include: {
        exam: true,
        subject: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const totalMarks = results.reduce((sum, r) => sum + r.marksObtained, 0);
    const averageMarks = results.length > 0 ? totalMarks / results.length : 0;

    res.status(200).json({
      success: true,
      data: {
        results,
        statistics: {
          totalSubjects: results.length,
          totalMarks,
          averageMarks: averageMarks.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Get student exam results error:", error);
    res.status(500).json({ message: "Failed to fetch student results" });
  }
};

export const getExamResults = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { examId, classId, subjectId } = req.query;

    const where: any = {};

    if (examId) {
      where.examId = examId;
    }

    if (subjectId) {
      where.subjectId = subjectId;
    }

    if (classId) {
      where.student = {
        classId,
      };
    }

    const results = await prisma.examResult.findMany({
      where,
      include: {
        exam: true,
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            class: true,
          },
        },
        subject: true,
      },
      orderBy: { marksObtained: "desc" },
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Get exam results error:", error);
    res.status(500).json({ message: "Failed to fetch exam results" });
  }
};

export const deleteExamResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.examResult.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Exam result deleted successfully",
    });
  } catch (error) {
    console.error("Delete exam result error:", error);
    res.status(500).json({ message: "Failed to delete exam result" });
  }
};
