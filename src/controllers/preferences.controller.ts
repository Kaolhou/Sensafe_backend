import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '../generated/prisma';

const prisma = new PrismaClient();

const updatePreferencesSchema = z
  .object({
    fontSize: z.number().int().min(8).max(72).optional().nullable(),
    batterySaverLevel: z.number().int().min(0).max(3).optional().nullable(),
    theme: z.string().min(1).max(20).optional().nullable(),
    language: z.string().min(2).max(10).optional().nullable(),
    notificationsEnabled: z.boolean().optional(),
  })
  .strict();

export const updateUserPreferences = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ message: 'Unauthorized: User ID not found in token.' });
  }

  const validationResult = updatePreferencesSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }

  const preferencesData = validationResult.data;

  if (Object.keys(preferencesData).length === 0) {
    return res.status(400).json({ message: 'No preference data provided.' });
  }

  try {
    const updatedPreferences = await prisma.userPreferences.upsert({
      where: {
        userId: userId,
      },
      update: {
        ...preferencesData,
      },
      create: {
        userId: userId,
        ...preferencesData,
      },
    });

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      res
        .status(500)
        .json({ message: 'An error occurred while updating preferences' });
  }
};

export const getUserPreferences = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ message: 'Unauthorized: User ID not found in token.' });
  }

  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: userId },
    });

    if (!preferences) {
      return res.status(200).json({ preferences: null });
    }

    res.status(200).json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while fetching preferences' });
  }
};
