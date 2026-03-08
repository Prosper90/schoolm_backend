import { Request } from "express";
import { UserRole } from "../generated/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    schoolId?: string | null;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface FilterQuery extends PaginationQuery {
  search?: string;
  schoolId?: string;
  classId?: string;
  role?: UserRole;
}
