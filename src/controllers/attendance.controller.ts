import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const markAttendance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId, date, status, remarks } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
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
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already marked for this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: attendanceDate,
      },
    });

    if (existingAttendance) {
      // Update existing attendance
      const updated = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status,
          ...(remarks !== undefined && { remarks }),
        },
        include: {
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
        },
      });

      res.status(200).json({
        success: true,
        message: "Attendance updated successfully",
        data: updated,
      });
      return;
    }

    // Create new attendance record
    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        date: attendanceDate,
        status,
        remarks,
        schoolId,
      },
      include: {
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
      },
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

export const bulkMarkAttendance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { attendanceRecords, date } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      res.status(400).json({ message: "Attendance records array is required" });
      return;
    }

    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Process bulk attendance - find existing and update or create
    const results = await prisma.$transaction(async (tx) => {
      const processedResults = [];

      for (const record of attendanceRecords) {
        const { studentId, status, remarks } = record;

        // Find existing attendance for this student on this date
        const existing = await tx.attendance.findFirst({
          where: {
            studentId,
            date: attendanceDate,
            schoolId,
          },
        });

        let attendance;
        if (existing) {
          // Update existing
          attendance = await tx.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              ...(remarks !== undefined && { remarks }),
            },
          });
        } else {
          // Create new
          attendance = await tx.attendance.create({
            data: {
              studentId,
              date: attendanceDate,
              status,
              remarks,
              schoolId,
            },
          });
        }
        processedResults.push(attendance);
      }

      return processedResults;
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${results.length} students`,
      data: results,
    });
  } catch (error) {
    console.error("Bulk mark attendance error:", error);
    res.status(500).json({ message: "Failed to mark bulk attendance" });
  }
};

export const getAttendanceByClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const attendanceDate = date ? new Date(date as string) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId,
        isSuspended: false,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        attendance: {
          where: {
            date: attendanceDate,
          },
        },
      },
      orderBy: {
        user: {
          firstName: "asc",
        },
      },
    });

    const attendanceData = students.map((student) => ({
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      admissionNumber: student.admissionNumber,
      attendance: student.attendance[0] || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        classId,
        date: attendanceDate,
        students: attendanceData,
        summary: {
          total: students.length,
          present: attendanceData.filter((a) => a.attendance?.status === "PRESENT").length,
          absent: attendanceData.filter((a) => a.attendance?.status === "ABSENT").length,
          late: attendanceData.filter((a) => a.attendance?.status === "LATE").length,
          notMarked: attendanceData.filter((a) => !a.attendance).length,
        },
      },
    });
  } catch (error) {
    console.error("Get attendance by class error:", error);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

export const getStudentAttendance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, page = "1", limit = "30" } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    // Verify student
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: true,
      },
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const where: any = { studentId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { date: "desc" },
      }),
      prisma.attendance.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId },
      _count: true,
    });

    const statistics = {
      present: stats.find((s) => s.status === "PRESENT")?._count || 0,
      absent: stats.find((s) => s.status === "ABSENT")?._count || 0,
      late: stats.find((s) => s.status === "LATE")?._count || 0,
      total: stats.reduce((sum, s) => sum + s._count, 0),
    };

    const attendancePercentage = statistics.total > 0
      ? ((statistics.present + statistics.late) / statistics.total) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          class: student.class?.name,
          admissionNumber: student.admissionNumber,
        },
        attendance,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
        statistics: {
          ...statistics,
          attendancePercentage: attendancePercentage.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Get student attendance error:", error);
    res.status(500).json({ message: "Failed to fetch student attendance" });
  }
};

export const getAttendanceReport = async (
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
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    if (classId) {
      where.student = {
        classId: classId as string,
      };
    }

    // Get overall statistics
    const overallStats = await prisma.attendance.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    const totalRecords = overallStats.reduce((sum, s) => sum + s._count, 0);

    // Get daily statistics
    const dailyStats = await prisma.attendance.groupBy({
      by: ["date", "status"],
      where,
      _count: true,
      orderBy: {
        date: "desc",
      },
    });

    // Group by date
    const dailyReport = dailyStats.reduce((acc: any, record) => {
      const dateStr = record.date.toISOString().split("T")[0];
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        };
      }
      acc[dateStr][record.status.toLowerCase()] = record._count;
      acc[dateStr].total += record._count;
      return acc;
    }, {});

    // Get students with poor attendance (< 75%)
    const studentsAttendance = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classId && { classId: classId as string }),
        isSuspended: false,
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
          },
        },
        attendance: {
          where: {
            ...(startDate && { date: { gte: new Date(startDate as string) } }),
            ...(endDate && { date: { lte: new Date(endDate as string) } }),
          },
        },
      },
    });

    const studentsWithPoorAttendance = studentsAttendance
      .map((student) => {
        const total = student.attendance.length;
        const present = student.attendance.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        return {
          studentId: student.id,
          studentName: `${student.user.firstName} ${student.user.lastName}`,
          class: student.class?.name,
          admissionNumber: student.admissionNumber,
          totalDays: total,
          presentDays: present,
          attendancePercentage: percentage.toFixed(2),
        };
      })
      .filter((s) => parseFloat(s.attendancePercentage) < 75)
      .sort((a, b) => parseFloat(a.attendancePercentage) - parseFloat(b.attendancePercentage))
      .slice(0, 20);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRecords,
          present: overallStats.find((s) => s.status === "PRESENT")?._count || 0,
          absent: overallStats.find((s) => s.status === "ABSENT")?._count || 0,
          late: overallStats.find((s) => s.status === "LATE")?._count || 0,
        },
        dailyReport: Object.values(dailyReport),
        studentsWithPoorAttendance,
      },
    });
  } catch (error) {
    console.error("Get attendance report error:", error);
    res.status(500).json({ message: "Failed to generate attendance report" });
  }
};

export const deleteAttendance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.attendance.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ message: "Failed to delete attendance record" });
  }
};
