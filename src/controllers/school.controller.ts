import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";
import { hashPassword } from "../utils/password";
import { UserRole } from "../generated/prisma";
import { sendWelcomeEmail } from "../services/email.service";

export const createSchool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      address,
      phone,
      email,
      level,
      country,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      primaryColor,
      secondaryColor,
    } = req.body;

    const existingSchool = await prisma.school.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingSchool) {
      res.status(409).json({ message: "School already exists" });
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      res.status(409).json({ message: "Admin email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(adminPassword);

    const school = await prisma.school.create({
      data: {
        name,
        address,
        phone,
        email,
        level,
        country: country || "Uganda",
        primaryColor: primaryColor || "#3B82F6",
        secondaryColor: secondaryColor || "#10B981",
        users: {
          create: {
            email: adminEmail,
            password: hashedPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: UserRole.SCHOOL_ADMIN,
          },
        },
      },
      include: {
        users: {
          where: { role: UserRole.SCHOOL_ADMIN },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    try {
      await sendWelcomeEmail(
        adminEmail,
        adminFirstName,
        "School Administrator"
      );
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "School created successfully",
      data: school,
    });
  } catch (error) {
    console.error("Create school error:", error);
    res.status(500).json({ message: "Failed to create school" });
  }
};

export const getAllSchools = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = search
      ? {
          OR: [
            { name: { contains: search as string, mode: "insensitive" as const } },
            { email: { contains: search as string, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: {
              students: true,
              staff: true,
              classes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.school.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        schools,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get schools error:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
};

export const getSchoolById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            staff: true,
            classes: true,
            subjects: true,
          },
        },
        users: {
          where: { role: UserRole.SCHOOL_ADMIN },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!school) {
      res.status(404).json({ message: "School not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error("Get school error:", error);
    res.status(500).json({ message: "Failed to fetch school" });
  }
};

export const updateSchool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, level, primaryColor, secondaryColor, logo } =
      req.body;

    const school = await prisma.school.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(level && { level }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(logo !== undefined && { logo }),
      },
    });

    res.status(200).json({
      success: true,
      message: "School updated successfully",
      data: school,
    });
  } catch (error) {
    console.error("Update school error:", error);
    res.status(500).json({ message: "Failed to update school" });
  }
};

export const deleteSchool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.school.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Delete school error:", error);
    res.status(500).json({ message: "Failed to delete school" });
  }
};

export const toggleSchoolStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      res.status(404).json({ message: "School not found" });
      return;
    }

    const updated = await prisma.school.update({
      where: { id },
      data: { isActive: !school.isActive },
    });

    const statusText = updated.isActive ? "activated" : "deactivated";

    res.status(200).json({
      success: true,
      message: `School ${statusText} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle school status error:", error);
    res.status(500).json({ message: "Failed to toggle school status" });
  }
};
