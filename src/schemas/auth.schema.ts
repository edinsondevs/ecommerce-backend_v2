import { z } from 'zod';

// 1. Lo que pedimos cuando alguien se REGISTRA
export const RegisterSchema = z.object({
	email: z.string().email({ message: 'Debe ser un email válido' }),
	password: z
		.string()
		.min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
	name: z.string().optional(),
});

// 2. Lo que pedimos cuando alguien hace LOGIN
export const LoginSchema = z.object({
	email: z.string().email({ message: 'Debe ser un email válido' }),
	password: z.string().min(1, { message: 'La contraseña es obligatoria' }),
});

// 3. Lo que DEVOLVEMOS del usuario (¡NUNCA devolvemos el password!)
export const UserResponseSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().nullable(),
	role: z.enum(['USER', 'ADMIN']),
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
});

// 4. Lo que DEVOLVEMOS cuando el Login es exitoso (El Token + El Usuario)
export const LoginResponseSchema = z.object({
	token: z.string(),
	user: UserResponseSchema,
});
