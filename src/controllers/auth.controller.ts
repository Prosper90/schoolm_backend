import { Request, Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { sendWelcomeEmail } from "../services/email.service";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      schoolName,
      schoolEmail,
      schoolPhone,
      address,
      district,
      firstName,
      lastName,
      email,
      phone,
      password,
    } = req.body;

    // Check if school already exists with same email or phone
    const existingSchool = await prisma.school.findFirst({
      where: { OR: [{ email: schoolEmail }, { phone: schoolPhone }] },
    });

    if (existingSchool) {
      res.status(409).json({ message: "A school with this email or phone already exists" });
      return;
    }

    // Check if admin email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Create school and admin user in a single transaction
    const school = await prisma.school.create({
      data: {
        name: schoolName,
        address: address || district,
        phone: schoolPhone,
        email: schoolEmail,
        level: "PRIMARY",
        users: {
          create: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: "SCHOOL_ADMIN",
          },
        },
      },
      include: {
        users: {
          where: { role: "SCHOOL_ADMIN" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            schoolId: true,
            createdAt: true,
          },
        },
      },
    });

    const user = school.users[0];

    try {
      await sendWelcomeEmail(user.email, user.firstName, "School Administrator");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "School registered successfully",
      data: user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
            secondaryColor: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is deactivated" });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          school: user.school,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token required" });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      res.status(401).json({ message: "Refresh token expired" });
      return;
    }

    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    const newAccessToken = generateAccessToken(payload);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            primaryColor: true,
            secondaryColor: true,
            logo: true,
          },
        },
        staff: true,
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};
