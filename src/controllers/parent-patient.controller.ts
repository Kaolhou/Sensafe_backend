import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, UserRecordType, Prisma } from '../generated/prisma';

const prisma = new PrismaClient();

// Schemas Zod
const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

const createParentPatientRelationshipSchema = z.object({
  parentId: uuidSchema,
  patientId: uuidSchema,
});

const paramsSchema = z.object({
  parentId: uuidSchema,
  patientId: uuidSchema,
});

const parentIdParamSchema = z.object({
  parentId: uuidSchema,
});

const patientIdParamSchema = z.object({
  patientId: uuidSchema,
});

// Controller Functions
export const createRelationship = async (req: Request, res: Response) => {
  const validationResult = createParentPatientRelationshipSchema.safeParse(
    req.body
  );
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }

  const { parentId, patientId } = validationResult.data;

  if (parentId === patientId) {
    return res
      .status(400)
      .json({ message: 'Parent ID and Patient ID cannot be the same.' });
  }

  try {
    const [parentUser, patientUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: parentId } }),
      prisma.user.findUnique({ where: { id: patientId } }),
    ]);

    if (!parentUser) {
      return res
        .status(404)
        .json({ message: `User with ID ${parentId} (parent) not found.` });
    }
    if (!patientUser) {
      return res
        .status(404)
        .json({ message: `User with ID ${patientId} (patient) not found.` });
    }

    if (parentUser.recordType !== UserRecordType.PARENT) {
      return res
        .status(400)
        .json({ message: `User ${parentId} is not of type PARENT.` });
    }
    if (patientUser.recordType !== UserRecordType.PATIENT) {
      return res
        .status(400)
        .json({ message: `User ${patientId} is not of type PATIENT.` });
    }

    const newRelationship = await prisma.parentPatientRelationship.create({
      data: {
        parentId,
        patientId,
      },
    });
    res.status(201).json(newRelationship);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          message: 'This parent-patient relationship already exists.',
        });
      }
    }
    console.error('Error creating relationship:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while creating the relationship.' });
  }
};

export const getRelationshipsByParentId = async (
  req: Request,
  res: Response
) => {
  const paramsValidation = parentIdParamSchema.safeParse(req.params);
  if (!paramsValidation.success) {
    return res.status(400).json({
      message: 'Invalid parent ID format',
      errors: paramsValidation.error.flatten().fieldErrors,
    });
  }
  const { parentId } = paramsValidation.data;

  try {
    const parentUser = await prisma.user.findUnique({
      where: { id: parentId },
    });
    if (!parentUser) {
      return res
        .status(404)
        .json({ message: `Parent user with ID ${parentId} not found.` });
    }

    const relationships = await prisma.parentPatientRelationship.findMany({
      where: { parentId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    res.status(200).json(relationships.map((rel) => rel.patient));
  } catch (error) {
    console.error('Error fetching relationships by parent ID:', error);
    res.status(500).json({
      message: 'An error occurred while fetching relationships by parent ID.',
    });
  }
};

export const getRelationshipsByPatientId = async (
  req: Request,
  res: Response
) => {
  const paramsValidation = patientIdParamSchema.safeParse(req.params);
  if (!paramsValidation.success) {
    return res.status(400).json({
      message: 'Invalid patient ID format',
      errors: paramsValidation.error.flatten().fieldErrors,
    });
  }
  const { patientId } = paramsValidation.data;

  try {
    const patientUser = await prisma.user.findUnique({
      where: { id: patientId },
    });
    if (!patientUser) {
      return res
        .status(404)
        .json({ message: `Patient user with ID ${patientId} not found.` });
    }

    const relationships = await prisma.parentPatientRelationship.findMany({
      where: { patientId },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
    res.status(200).json(relationships.map((rel) => rel.parent));
  } catch (error) {
    console.error('Error fetching relationships by patient ID:', error);
    res.status(500).json({
      message: 'An error occurred while fetching relationships by patient ID.',
    });
  }
};

export const getRelationship = async (req: Request, res: Response) => {
  const paramsValidation = paramsSchema.safeParse(req.params);
  if (!paramsValidation.success) {
    return res.status(400).json({
      message: 'Invalid parent or patient ID format',
      errors: paramsValidation.error.flatten().fieldErrors,
    });
  }
  const { parentId, patientId } = paramsValidation.data;

  try {
    const relationship = await prisma.parentPatientRelationship.findUnique({
      where: { parentId_patientId: { parentId, patientId } },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found.' });
    }
    res.status(200).json(relationship);
  } catch (error) {
    console.error('Error fetching relationship:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while fetching the relationship.' });
  }
};

export const deleteRelationship = async (req: Request, res: Response) => {
  const paramsValidation = paramsSchema.safeParse(req.params);
  if (!paramsValidation.success) {
    return res.status(400).json({
      message: 'Invalid parent or patient ID format',
      errors: paramsValidation.error.flatten().fieldErrors,
    });
  }
  const { parentId, patientId } = paramsValidation.data;

  try {
    await prisma.parentPatientRelationship.delete({
      where: { parentId_patientId: { parentId, patientId } },
    });
    res.status(204).send(); // No content
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record to delete not found
        return res
          .status(404)
          .json({ message: 'Relationship not found for deletion.' });
      }
    }
    console.error('Error deleting relationship:', error);
    res
      .status(500)
      .json({ message: 'An error occurred while deleting the relationship.' });
  }
};
