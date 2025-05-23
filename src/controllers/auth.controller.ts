import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient, User, UserRecordType } from '../generated/prisma';
import { generateToken } from '../utils/generateToken';

const prisma = new PrismaClient();

const registerUserSchema = z
  .object({
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
    parentEmail: z
      .string()
      .email({ message: 'Invalid parent email format' })
      .optional(),
    // Campos para Device e Geolocation (opcionais por padrão, validados em superRefine)
    serialNumber: z.string().optional(),
    deviceName: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recordType === UserRecordType.PATIENT && !data.parentEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Parent email is required when record type is PATIENT',
        path: ['parentEmail'],
      });
    }
    if (data.recordType === UserRecordType.PATIENT) {
      if (!data.serialNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Device serial number is required when record type is PATIENT',
          path: ['serialNumber'],
        });
      }
      if (typeof data.latitude !== 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Initial latitude is required when record type is PATIENT',
          path: ['latitude'],
        });
      }
      if (typeof data.longitude !== 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Initial longitude is required when record type is PATIENT',
          path: ['longitude'],
        });
      }
    } else if (data.recordType === UserRecordType.PARENT) {
      // PARENT não deve ter campos de paciente/dispositivo
      if (data.parentEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Parent email should not be provided when record type is PARENT',
          path: ['parentEmail'],
        });
      }
      if (data.serialNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Device serial number should not be provided when record type is PARENT',
          path: ['serialNumber'],
        });
      }
      if (data.deviceName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Device name should not be provided when record type is PARENT',
          path: ['deviceName'],
        });
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Parent email should not be provided when record type is PARENT',
        path: ['parentEmail'],
      });
      if (typeof data.latitude === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Latitude should not be provided when record type is PARENT',
          path: ['latitude'],
        });
      }
      if (typeof data.longitude === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Longitude should not be provided when record type is PARENT',
          path: ['longitude'],
        });
      }
    }
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

  const {
    email,
    password,
    recordType,
    firstName,
    lastName,
    parentEmail,
    serialNumber, // Novo campo
    deviceName, // Novo campo
    latitude, // Novo campo
    longitude, // Novo campo
  } = validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: 'User with this email already exists' });
    }

    let parentUser: User | null;
    if (recordType === UserRecordType.PATIENT) {
      if (!parentEmail) {
        // Double check, though superRefine should catch this
        return res
          .status(400)
          .json({ message: 'Parent email is required for PATIENT accounts' });
      }
      parentUser = await prisma.user.findUnique({
        where: { email: parentEmail },
      });

      if (!parentUser) {
        return res
          .status(404)
          .json({ message: 'Parent user with the provided email not found' });
      }
      if (parentUser.recordType !== UserRecordType.PARENT) {
        return res.status(400).json({
          message:
            'The provided parent email does not belong to a PARENT account',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Iniciar transação Prisma
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
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

      if (recordType === UserRecordType.PATIENT) {
        // Validação adicional (Zod já deve ter coberto isso)
        if (
          !serialNumber ||
          typeof latitude !== 'number' ||
          typeof longitude !== 'number'
        ) {
          throw new Error(
            'Internal Server Error: Missing required patient device or location data after validation.'
          );
        }

        const newDevice = await tx.device.create({
          data: {
            serialNumber,
            name: deviceName, // deviceName é opcional
            patientId: newUser.id,
          },
        });

        await tx.geolocation.create({
          data: {
            latitude,
            longitude,
            deviceId: newDevice.id,
          },
        });

        if (parentUser) {
          await tx.parentPatientRelationship.create({
            data: {
              parentId: parentUser.id,
              patientId: newUser.id,
            },
          });
        }
      }

      let sessionDurationMs = 24 * 60 * 60 * 1000;
      sessionDurationMs *= newUser.recordType === UserRecordType.PARENT ? 1 : 7; // Patient sessions last longer
      const sessionExpiresAt = new Date(Date.now() + sessionDurationMs);

      const newSession = await tx.userSession.create({
        data: {
          userId: newUser.id,
          expiresAt: sessionExpiresAt,
        },
        select: {
          id: true,
          expiresAt: true,
        },
      });

      return { newUser, newSession };
    });

    const { newUser, newSession } = result;

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
    if (
      error instanceof Error &&
      error.message.startsWith('Internal Server Error:')
    ) {
      // Erro de lógica interna
      return res.status(500).json({ message: error.message });
    }
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
