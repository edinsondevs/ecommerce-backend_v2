import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma'; // 👈 Asegúrate de que esta ruta apunte a tu config
import app from '../app';

interface authResponseInterface {
	id: string;
	email: string;
	password: string;
	name: string;
	role: 'USER' |'ADMIN';
	createdAt: any;
	updatedAt: any;
}

interface RootObject {
	data: Data;
}

interface Data {
	token: string;
	user: User;
}

interface User {
	id: string;
	email: string;
	name: string;
	role: string;
	createdAt: string;
	updatedAt: string;
}

interface Response {
    status: 'success' | 'error';
    message: string;
}

describe('Rutas de Autenticación (/api/auth)', () => {
	// Limpiamos los mocks antes de cada test para que no interfieran entre sí
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST /api/auth/register', () => {
		it('Debería registrar un usuario exitosamente (201)', async () => {
			// 1. PREPARACIÓN (Arrange)
			const mockUser: Omit<authResponseInterface, 'password'> = {
				id: 'c9d11bbc-1c21-4b41-a6f8-1b26e8c5c381',
				email: 'admin3@tienda.com',
				name: 'Usuario Test',
				role: 'USER',
				createdAt: new Date().toDateString(),
				updatedAt: new Date().toDateString(),
			};

			// Simulamos que el correo NO existe en la BD
			vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

			// Simulamos que bcrypt encripta al instante (no consume CPU)
			vi.spyOn(bcrypt, 'hash').mockResolvedValue(
				'hashed_password_mock' as any,
			);

			// Simulamos que Prisma guarda al usuario y nos lo devuelve
			vi.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

			// 2. ACCIÓN (Act) - Usamos .inject() de Fastify
			const response = await app.inject({
				method: 'POST',
				url: '/api/auth/register',
				payload: {
					email: 'admin3@tienda.com',
					password: 'password123',
					name: 'Usuario Test',
				},
			});

			// 3. VERIFICACIÓN (Assert)
			expect(response.statusCode).toBe(201);

			const responseBody = JSON.parse(response.payload);
			// Verificamos que el password NO venga en la respuesta
			expect(responseBody.data).not.toHaveProperty('password');
			expect(responseBody.data.email).toBe('admin3@tienda.com');

			// Verificamos que nuestros Mocks realmente fueron llamados
			expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
			expect(prisma.user.create).toHaveBeenCalledOnce();
		});

		it('Debería fallar si el email ya existe (409)', async () => {

			// 1. Haz que prisma.user.findUnique devuelva un objeto (simulando que ya existe).
            const mockUser: Response = {
				status: 'error',
				message: 'Conflicto: El registro ya existe en la base de datos.'
			};

            vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

            const response = await app.inject({
				method: 'POST',
				url: '/api/auth/register',
				payload: {
					email: 'admin2@tienda.com',
					password: 'super_password_123',
					name: 'usuario de test',
				},
			});

			// 3. Verifica que el statusCode sea 409
            expect(response.statusCode).toBe(409);
            // 4. Verifica que el mensaje de error sea el correcto
            const responseBody = JSON.parse(response.payload);
            expect(responseBody.message).toBe('Conflicto: El registro ya existe en la base de datos.');

		});
	});

	describe('POST /api/auth/login', () => {
		it('Debería hacer login y devolver un token (200)', async () => {
			// 1. PREPARACIÓN (Arrange)
			const mockDbUser: authResponseInterface = {
				id: '4b834d5d-719a-4927-905e-710a1c50f786',
				email: 'admin2@tienda.com',
				name: 'Admin Principal',
				role: 'USER' as const,
				password: 'hashed_password_mock',
				createdAt: new Date('2026-04-05'),
				updatedAt: new Date('2026-04-05'),
			};

			// Simulamos que encuentra al usuario en la base de datos
			vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockDbUser);

			// Simulamos que bcrypt.compare dice que la contraseña coincide (devuelve true)
			vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);

			// 2. ACCIÓN (Act)
			const response = await app.inject({
				method: 'POST',
				url: '/api/auth/login',
				payload: {
					email: 'admin2@tienda.com',
					password: 'super_password_123',
				},
			});

			// 3. VERIFICACIÓN (Assert)
			expect(response.statusCode).toBe(200);

			const responseBody = JSON.parse(response.payload);

			expect(responseBody.data).toHaveProperty('token'); // ¡Validamos que venga el JWT!
			expect(responseBody.data.user.email).toBe('admin2@tienda.com');
		});
	});
});
