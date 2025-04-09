import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient, UserRecordType } from '@prisma/client';
import { generateToken } from '../utils/generateToken';

const prisma = new PrismaClient();

const registerUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  recordType: z.nativeEnum(UserRecordType, {
    errorMap: () => ({ message: 'Invalid record type. Must be PARENT or PATIENT' })
  }),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const loginUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});


export const register = async (req: Request, res: Response) => {
  const validationResult = registerUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors });
  }

  const { email, password, recordType, firstName, lastName } = validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
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
        createdAt: true
      }
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  const validationResult = loginUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors });
  }

  const { email, password } = validationResult.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
        id: user.id,
        email: user.email,
        recordType: user.recordType
    };
    const token = generateToken(payload);

    res.json({ token });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
};
