import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const createLeaveType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        description,
        schoolId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Leave type created successfully",
      data: leaveType,
    });
  } catch (error) {
    console.error("Create leave type error:", error);
    res.status(500).json({ message: "Failed to create leave type" });
  }
};

export const getAllLeaveTypes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      data: leaveTypes,
    });
  } catch (error) {
    console.error("Get leave types error:", error);
    res.status(500).json({ message: "Failed to fetch leave types" });
  }
};

export const updateLeaveType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Leave type updated successfully",
      data: leaveType,
    });
  } catch (error) {
    console.error("Update leave type error:", error);
    res.status(500).json({ message: "Failed to update leave type" });
  }
};

export const deleteLeaveType = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.leaveType.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Leave type deleted successfully",
    });
  } catch (error) {
    console.error("Delete leave type error:", error);
    res.status(500).json({ message: "Failed to delete leave type" });
  }
};

export const applyLeave = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { leaveTypeId, leaveType, startDate, endDate, reason } = req.body;

    const userId = req.user?.userId;
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    if (!leaveTypeId && !leaveType) {
      res.status(400).json({ message: "Leave type is required" });
      return;
    }

    // Get staff record for the user
    const staff = await prisma.staff.findFirst({
      where: { userId },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff record not found" });
      return;
    }

    // Resolve leaveTypeId: use provided ID, or find/create by name
    let resolvedLeaveTypeId = leaveTypeId;
    if (!resolvedLeaveTypeId && leaveType) {
      let existing = await prisma.leaveType.findFirst({
        where: { name: leaveType, schoolId },
      });
      if (!existing) {
        existing = await prisma.leaveType.create({
          data: { name: leaveType, schoolId },
        });
      }
      resolvedLeaveTypeId = existing.id;
    }

    const leave = await prisma.leave.create({
      data: {
        staffId: staff.id,
        leaveTypeId: resolvedLeaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: "PENDING",
      },
      include: {
        leaveType: true,
        staff: {
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
      message: "Leave application submitted successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ message: "Failed to apply for leave" });
  }
};

export const getAllLeaves = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", status, staffId } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      staff: {
        schoolId,
      },
    };

    if (status) {
      where.status = status;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          leaveType: true,
          staff: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              department: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.leave.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leaves,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get leaves error:", error);
    res.status(500).json({ message: "Failed to fetch leaves" });
  }
};

export const getMyLeaves = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff record not found" });
      return;
    }

    const leaves = await prisma.leave.findMany({
      where: { staffId: staff.id },
      include: {
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Helper to calculate days between dates
    const calculateDays = (start: Date, end: Date) => {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Calculate leave statistics
    const stats = {
      pending: leaves.filter((l) => l.status === "PENDING").length,
      approved: leaves.filter((l) => l.status === "APPROVED").length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
      totalDaysTaken: leaves
        .filter((l) => l.status === "APPROVED")
        .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0),
    };

    res.status(200).json({
      success: true,
      data: {
        leaves,
        statistics: stats,
      },
    });
  } catch (error) {
    console.error("Get my leaves error:", error);
    res.status(500).json({ message: "Failed to fetch your leaves" });
  }
};

export const getLeaveById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        leaveType: true,
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            department: true,
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!leave) {
      res.status(404).json({ message: "Leave not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Get leave error:", error);
    res.status(500).json({ message: "Failed to fetch leave" });
  }
};

export const updateLeaveStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status,
        ...(approvedBy && { approvedBy }),
      },
      include: {
        leaveType: true,
        staff: {
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
      message: `Leave ${status.toLowerCase()} successfully`,
      data: leave,
    });
  } catch (error) {
    console.error("Update leave status error:", error);
    res.status(500).json({ message: "Failed to update leave status" });
  }
};

export const cancelLeave = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId },
    });

    if (!staff) {
      res.status(404).json({ message: "Staff record not found" });
      return;
    }

    // Verify leave belongs to user
    const leave = await prisma.leave.findFirst({
      where: {
        id,
        staffId: staff.id,
      },
    });

    if (!leave) {
      res.status(404).json({ message: "Leave not found or unauthorized" });
      return;
    }

    if (leave.status !== "PENDING") {
      res.status(400).json({
        message: "Can only cancel pending leave applications",
      });
      return;
    }

    await prisma.leave.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Leave application cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel leave error:", error);
    res.status(500).json({ message: "Failed to cancel leave" });
  }
};

export const getLeaveReport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, departmentId } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const where: any = {
      staff: {
        schoolId,
        ...(departmentId && { departmentId: departmentId as string }),
      },
    };

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate as string);
      }
    }

    // Get all leaves for calculating days
    const allLeaves = await prisma.leave.findMany({
      where,
      include: {
        leaveType: true,
      },
    });

    // Helper to calculate days between dates
    const calculateDays = (start: Date, end: Date) => {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    // Calculate statistics
    const pending = allLeaves.filter((l) => l.status === "PENDING");
    const approved = allLeaves.filter((l) => l.status === "APPROVED");
    const rejected = allLeaves.filter((l) => l.status === "REJECTED");

    const totalDaysTaken = approved.reduce(
      (sum, l) => sum + calculateDays(l.startDate, l.endDate),
      0
    );

    // Group by leave type
    const leaveTypeGroups = allLeaves.reduce((acc: any, leave) => {
      const typeId = leave.leaveTypeId;
      if (!acc[typeId]) {
        acc[typeId] = {
          leaveType: leave.leaveType.name,
          count: 0,
          totalDays: 0,
        };
      }
      acc[typeId].count++;
      acc[typeId].totalDays += calculateDays(leave.startDate, leave.endDate);
      return acc;
    }, {});

    const leaveTypeReport = Object.values(leaveTypeGroups);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: allLeaves.length,
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          totalDaysTaken,
        },
        byLeaveType: leaveTypeReport,
      },
    });
  } catch (error) {
    console.error("Get leave report error:", error);
    res.status(500).json({ message: "Failed to generate leave report" });
  }
};
