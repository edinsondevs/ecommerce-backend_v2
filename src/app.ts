import fastifyJwt from '@fastify/jwt';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';

import fastifySwagger from '@fastify/swagger'; 
import fastifySwaggerUi from '@fastify/swagger-ui';

// Tus importaciones de rutas y plugins...
import { productRoutes } from './routes/product.routes';
import AuthService from './routes/auth.routes';
import { errorHandler } from './plugins/errorHandler.js';

/*******************************************************************************
 * @description: Implementación del Servidor (El Corazón con Fastify)
 * Usaremos fastify-type-provider-zod para que el autocompletado sea perfecto.
********************************************************************************/

// Instanciamos Fastify y le decimos: "Tus tipos van a venir de Zod"
const app: FastifyInstance = Fastify({logger: {level: 'error'} }).withTypeProvider<ZodTypeProvider>();

// Configuración de validadores Zod para Fastify - Le inyectamos los "compiladores" 
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// 1. Registramos el plugin de JWT
app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'super_secreto_de_respaldo_por_si_acaso'
});

// 👇 Le enseñamos a TypeScript que Fastify ahora sabe de JWT
declare module 'fastify' {
    export interface FastifyInstance {
        authenticate: any;
        requireAdmin: any
    }
}

// 👇 ENTRENAMOS AL GUARDIA: Creamos la función que verifica el Token
app.decorate('authenticate', async function (request: any, reply: any) {
    try {
        await request.jwtVerify(); // Esto lee el header "Authorization: Bearer <token>"
    } catch (err) {
        // Si no hay token, o está expirado, o es falso, lanzamos 401
        reply.code(401).send({ status: 'error', message: 'Token faltante o inválido' });
    }
});

// 👇 NUEVO: Guardia para Administradores
app.decorate(
	"requireAdmin",
	async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			// 1. Primero verificamos que el token sea válido (reutilizamos authenticate)
			await request.jwtVerify();

			// 2. Extraemos el usuario del token ya verificado
			const user = request.user as { role: string };

			// 3. Verificamos si es ADMIN
			if (user.role !== "ADMIN") {
				return reply.status(403).send({
					status: "error",
					message:
						"Acceso denegado: Se requieren permisos de administrador",
				});
			}
		} catch (err) {
			return reply
				.status(401)
				.send({ status: "error", message: "Token inválido" });
		}
	},
);

// (Regla de Oro de Fastify): Swagger debe registrarse antes que tus rutas, para que pueda "escuchar" cuando las rutas se conectan.
// ==========================================
// 1. CONFIGURACIÓN DE SWAGGER
// ==========================================
// Genera el documento OpenAPI (JSON)
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API de Inventario E-Commerce',
      description: 'Documentación interactiva de la API (Fastify + Prisma + Zod)',
      version: '1.0.0',
    },
    components:{
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  // ¡MAGIA!: Transforma nuestros esquemas de Zod al formato que Swagger entiende
  transform: jsonSchemaTransform, 
});

// Genera la interfaz visual web
app.register(fastifySwaggerUi, {
  routePrefix: '/docs', // La URL donde veremos la documentación
});
// ==========================================

// 2. REGISTRO DE RUTAS (Siempre después de Swagger)
app.register(productRoutes, { prefix: '/api' });
app.register(AuthService, { prefix: '/api/auth' });

// 3. Manejador de errores
app.setErrorHandler(errorHandler);

export const start = async () => {
	try {
		await app.listen({ port: process.env.PORT ? Number(process.env.PORT) : 3000 });
		// console.log('🚀 Fastify Server Ready at http://localhost:3000');
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
};
if (!process.env.VITEST) {
  start();
}

export default app; // Exportamos la instancia para usarla en las pruebas (Vitest)