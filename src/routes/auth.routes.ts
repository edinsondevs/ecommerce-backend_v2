import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import {
	RegisterSchema,
	LoginSchema,
	UserResponseSchema,
	LoginResponseSchema,
} from '../schemas/auth.schema';

export default async function authRoutes(server: FastifyInstance) {
	// * -----------------------------------------
	// * POST /api/auth/register
	// * -----------------------------------------
	server.post(
		'/register',
		{
			schema: {
				summary: 'Registro de Usuario',
				description: 'Crea un nuevo usuario encriptando su contraseña.',
				tags: ['Autenticación'],
				body: RegisterSchema,
				response: {
					201: z.object({
						data: UserResponseSchema,
					}),
				},
			},
		},
		async (request, reply) => {
			// Zod ya validó que el body trae email y password correctos
			const user = await AuthService.register(request.body as any);
			return reply.code(201).send({ data: user });
		},
	);

	// * -----------------------------------------
	// * POST /api/auth/login
	// * -----------------------------------------
	server.post(
		'/login',
		{
			schema: {
				summary: 'Login de Usuario',
				description: 'Verifica credenciales y devuelve un Token JWT.',
				tags: ['Autenticación'],
				body: LoginSchema,
				response: {
					200: z.object({
						data: LoginResponseSchema,
					}),
				},
			},
		},
		async (request, reply) => {
			// 1. Verificamos que el usuario y contraseña sean correctos
			const user = await AuthService.login(request.body as any);

			// 2. MAGIA: Firmamos el token JWT.
			// Le guardamos dentro el ID, email y rol para no tener que buscar al usuario en la DB en cada petición futura.
			const token = server.jwt.sign(
				{ id: user.id, email: user.email, role: user.role },
				{ expiresIn: '8h' }, // El token dejará de funcionar en 8 horas por seguridad
			);

			// 3. Devolvemos la respuesta
			return reply.code(200).send({
				data: {
					token: token,
					user: user,
				},
			});
		},
	);
}
