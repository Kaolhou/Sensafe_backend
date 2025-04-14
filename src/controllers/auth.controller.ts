import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient, UserRecordType } from '../generated/prisma';
import { generateToken } from '../utils/generateToken';

const prisma = new PrismaClient();

const registerUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' }),
  recordType: z.nativeEnum(UserRecordType, {
    errorMap: () => ({
      message: 'Invalid record type. Must be PARENT or PATIENT',
    }),
  }),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

const loginUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const register = async (req: Request, res: Response) => {
  const validationResult = registerUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }

  const { email, password, recordType, firstName, lastName } =
    validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        recordType,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        recordType: true,
        createdAt: true,
      },
    });

    let sessionDurationMs = 24 * 60 * 60 * 1000;
    sessionDurationMs *= newUser.recordType == 'PARENT' ? 1 : 7;

    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const newSession = await prisma.userSession.create({
      data: {
        userId: newUser.id,
        expiresAt: expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      recordType: newUser.recordType,
      sessionId: newSession.id,
      expiresAt: newSession.expiresAt,
    });

    res
      .status(201)
      .setHeader('Set-Cookie', token)
      .json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  const validationResult = loginUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }

  const { email, password } = validationResult.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const sessionDurationMs = 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const newSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        expiresAt: expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      recordType: user.recordType,
      sessionId: newSession.id,
      expiresAt: newSession.expiresAt,
    });

    res
      .status(200)
      .setHeader('Set-Cookie', token)
      .json({ message: 'User logged in successfully', id: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
};
