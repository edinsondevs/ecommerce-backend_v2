import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // 1. Errores de Validación (Zod + Fastify)
  // Fastify inyecta la propiedad 'validation' cuando un esquema falla
  console.log('Error Capturado por el Manejador de Errores Personalizado:', JSON.stringify(error, null, 2));
  if (error.validation) {
    return reply.status(400).send({
      status: 'error',
      message: 'Datos de entrada inválidos',
      details: error.validation
    });
  }

  // 2. Errores de Base de Datos (Prisma)
    // Código P2002: Violación de restricción única (Ej. SKU duplicado)
    if (error.code === 'P2002') {
      return reply.status(409).send({
        status: 'error',
        message: 'Conflicto: El registro ya existe en la base de datos.',
        // Prisma nos dice qué campo causó el conflicto (ej. 'sku')
        target: (error as any).meta?.target 
      });
    }
    
    // Código P2025: Registro no encontrado (Para cuando hagamos UPDATE/DELETE)
    if (error.code === 'P2025') {
      return reply.status(404).send({
        status: 'error',
        message: 'El recurso solicitado no existe.'
      });
    }

  // 3. Logs internos para el desarrollador (No se envían al cliente)
  request.log.error(error);

  // 4. Error genérico por defecto (Fallback)
  return reply.status(500).send({
    status: 'error',
    message: 'Error interno del servidor. Por favor, contacte a soporte.'
  });
};