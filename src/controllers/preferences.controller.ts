import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@generated'; // Import Prisma types if needed for error handling

const prisma = new PrismaClient();

const updatePreferencesSchema = z.object({
    fontSize: z.number().int().min(8).max(72).optional().nullable(), 
    batterySaverLevel: z.number().int().min(0).max(3).optional().nullable(),
    theme: z.string().min(1).max(50).optional().nullable(),
    language: z.string().min(2).max(10).optional().nullable(), 
    notificationsEnabled: z.boolean().optional(),
}).strict();

export const updateUserPreferences = async (req: Request, res: Response) => {
    // 1. Get Authenticated User ID (Assuming middleware adds req.user)
    //    Adjust '.user.id' if your middleware uses a different structure
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    // 2. Validate Request Body
    const validationResult = updatePreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res
            .status(400)
            .json({
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
    }

    const preferencesData = validationResult.data;

    // Prevent sending empty data
     if (Object.keys(preferencesData).length === 0) {
        return res.status(400).json({ message: 'No preference data provided.' });
     }


    try {
        // 3. Use Prisma Upsert
        // - Finds preferences by userId.
        // - If found, updates with validated data.
        // - If not found, creates new preferences with userId and validated data.
        const updatedPreferences = await prisma.userPreferences.upsert({
            where: {
                userId: userId, // Unique identifier to find the record
            },
            update: {
                ...preferencesData, // Data to update if record exists
                // updatedAt is handled automatically by Prisma @updatedAt
            },
            create: {
                userId: userId,     // Link to the user
                ...preferencesData, // Data for the new record
                // createdAt/updatedAt handled automatically
            },
            // Optionally select specific fields to return
            // select: { ... }
        });

        // 4. Send Response
        res.status(200).json({
            message: 'Preferences updated successfully',
            preferences: updatedPreferences,
        });

    } catch (error) {
        console.error('Error updating preferences:', error);
        // Handle potential Prisma errors if needed (e.g., foreign key constraints)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
           // Example: Handle specific Prisma error codes if necessary
           // if (error.code === 'Pxxxx') { ... }
        }
        res.status(500).json({ message: 'An error occurred while updating preferences' });
    }
};

// You might also want a GET endpoint to retrieve preferences
/**
 * @route   GET /api/preferences
 * @desc    Get user preferences
 * @access  Private (Requires Authentication)
 */
export const getUserPreferences = async (req: Request, res: Response) => {
     const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    try {
        const preferences = await prisma.userPreferences.findUnique({
            where: { userId: userId },
        });

        if (!preferences) {
            // It's okay if preferences don't exist yet, return defaults or null/empty object
            // Option 1: Return null/empty
             return res.status(200).json({ preferences: null });
            // Option 2: Return default values (define defaults here or elsewhere)
            // const defaultPreferences = { fontSize: 16, theme: 'light', ... };
            // return res.status(200).json({ preferences: defaultPreferences });
        }

        res.status(200).json({ preferences });

    } catch (error) {
         console.error('Error fetching preferences:', error);
         res.status(500).json({ message: 'An error occurred while fetching preferences' });
    }
}
