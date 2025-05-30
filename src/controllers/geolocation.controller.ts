import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, UserRecordType } from '../generated/prisma';

const prisma = new PrismaClient();

// Schema para validar os dados de entrada ao criar uma geolocalização
const createGeolocationSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  serialNumber: z.string().min(1, 'Serial number is required'),
});

// Schema para validar o parâmetro serialNumber ao buscar a última geolocalização
// Schema para validar o parâmetro patientId ao buscar a última geolocalização
const getLatestGeolocationByPatientParamsSchema = z.object({
  // patientId é geralmente um UUID
  patientId: z.string().uuid({ message: 'Invalid Patient ID format' }),
});

/**
 * @route POST /api/geolocations
 * @description Cria um novo registro de geolocalização para um dispositivo.
 * @access Private (implementar autenticação/autorização conforme necessário)
 */
export const createGeolocation = async (req: Request, res: Response) => {
  const validationResult = createGeolocationSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }

  const { latitude, longitude, serialNumber } = validationResult.data;

  try {
    // 1. Encontrar o dispositivo pelo serialNumber
    const device = await prisma.device.findFirst({
      where: { serialNumber },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!device) {
      return res.status(404).json({
        message: `Device with serial number '${serialNumber}' not found.`,
      });
    }

    // 2. Criar o registro de geolocalização
    const newGeolocation = await prisma.geolocation.create({
      data: {
        latitude,
        longitude,
        deviceId: device.id,
        // timestamp é definido por @default(now()) no schema
      },
    });

    return res.status(201).json({
      message: 'Geolocation registered successfully',
      geolocation: newGeolocation,
    });
  } catch (error) {
    console.error('Error creating geolocation:', error);
    // Verificar se é um erro conhecido do Prisma (ex: violação de constraint)
    // if (error instanceof Prisma.PrismaClientKnownRequestError) { ... }
    return res
      .status(500)
      .json({ message: 'An error occurred while registering geolocation.' });
  }
};

/**
 * @route GET /api/geolocations/latest/:serialNumber
 * @description Obtém a última geolocalização registrada para um dispositivo.
 * @access Private (implementar autenticação/autorização conforme necessário)
 */
export const getLatestGeolocationByDevice = async (
  req: Request,
  res: Response
) => {
  const paramsValidationResult =
    getLatestGeolocationByPatientParamsSchema.safeParse(req.params);

  if (!paramsValidationResult.success) {
    return res.status(400).json({
      message: 'Invalid serial number parameter',
      errors: paramsValidationResult.error.flatten().fieldErrors,
    });
  }

  const { patientId } = paramsValidationResult.data;

  try {
    // 1. Encontrar o dispositivo pelo serialNumber
    // 1. Verificar se o paciente (usuário do tipo PATIENT) existe
    const patientUser = await prisma.user.findUnique({
      where: { id: patientId, recordType: UserRecordType.PATIENT },
    });

    if (!patientUser) {
      return res
        .status(404)
        .json({ message: `Patient with ID '${patientId}' not found.` });
    }
    const device = await prisma.device.findFirst({
      where: { patientId: patientId },
      orderBy: {
        createdAt: 'desc',
      },
      select: { id: true, serialNumber: true }, // Só precisamos do ID para a próxima query
    });

    if (!device) {
      return res.status(404).json({
        message: `Device not found.`,
      });
    }

    // 2. Buscar a última geolocalização para o deviceId encontrado
    const latestGeolocation = await prisma.geolocation.findFirst({
      where: {
        deviceId: device.id,
      },
      orderBy: {
        timestamp: 'desc', // Ordena pela data mais recente
      },
    });

    if (!latestGeolocation) {
      return res.status(404).json({
        message: `No geolocation data found for device '${device.serialNumber}'.`,
      });
    }

    return res.status(200).json(latestGeolocation);
  } catch (error) {
    console.error('Error fetching latest geolocation:', error);
    return res.status(500).json({
      message: 'An error occurred while fetching the latest geolocation.',
    });
  }
};
