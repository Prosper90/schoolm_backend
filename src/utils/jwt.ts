import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { config } from "../config";
import { UserRole } from "../generated/prisma";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  if (!config.jwt.accessSecret) {
    throw new Error(
      "JWT_ACCESS_SECRET is not defined in environment variables",
    );
  }

  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as any,
  };

  return jwt.sign(payload, config.jwt.accessSecret as Secret, options);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as any,
  };

  return jwt.sign(payload, config.jwt.refreshSecret as Secret, options);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.accessSecret as Secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.refreshSecret as Secret) as JWTPayload;
};
