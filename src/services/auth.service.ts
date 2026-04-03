import bcrypt from 'bcrypt';
// Ajusta la ruta de importación de prisma según tu estructura real (suele ser '../plugins/prisma' o similar)
import prisma from '../config/prisma.js';

export class AuthService {
	// ==========================================
	// MÉTODO 1: REGISTRO DE USUARIO
	// ==========================================
	static async register(data: {
		email: string;
		password: string;
		name?: string;
	}) {
		// 1. Verificamos si el correo ya existe
		const existingUser = await prisma.user.findUnique({
			where: { email: data.email },
		});

		if (existingUser) {
			const error = new Error('El correo ya está registrado');
			(error as any).code = 'P2002'; // Simulamos el error de Prisma para que el ErrorHandler lo atrape (409)
			throw error;
		}

		// 2. Encriptamos la contraseña (El 10 es el "Salt rounds", estándar seguro)
		const hashedPassword = await bcrypt.hash(data.password, 10);

		// 3. Guardamos en Base de Datos
		const user = await prisma.user.create({
			data: {
				email: data.email,
				password: hashedPassword,
				name: data.name,
			},
		});

		// 4. Quitamos el password del objeto antes de devolverlo
		const { password, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}

	// ==========================================
	// MÉTODO 2: LOGIN DE USUARIO
	// ==========================================
	static async login(data: { email: string; password: string }) {
		// 1. Buscamos al usuario
		const user = await prisma.user.findUnique({
			where: { email: data.email },
		});

		// 2. Si no existe, lanzamos error 401
		if (!user) {
			const error = new Error('Credenciales inválidas');
			(error as any).statusCode = 401;
			throw error;
		}

		// 3. Comparamos la contraseña en texto plano (data.password) con el hash de la DB (user.password)
		const isPasswordValid = await bcrypt.compare(
			data.password,
			user.password,
		);

		if (!isPasswordValid) {
			const error = new Error('Credenciales inválidas');
			(error as any).statusCode = 401;
			throw error;
		}

		// 4. Quitamos el password
		const { password, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}
}
