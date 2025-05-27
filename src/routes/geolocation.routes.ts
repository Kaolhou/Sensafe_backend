// Exemplo em src/routes/geolocation.routes.ts
import { Router } from 'express';
import {
  createGeolocation,
  getLatestGeolocationByDevice,
} from '../controllers/geolocation.controller';
// Se você tiver middleware de autenticação, importe-o aqui
// import { isAuthenticated } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/geolocations
// Idealmente, proteja esta rota para que apenas dispositivos autenticados possam enviar dados
router.post('/', /* isAuthenticated, */ createGeolocation);

// GET /api/geolocations/latest/:patientId
// Idealmente, proteja esta rota para que apenas usuários autorizados (ex: o PARENT do PATIENT dono do device)
// possam ver a localização.
router.get('/latest/:patientId', getLatestGeolocationByDevice);

export default router;
