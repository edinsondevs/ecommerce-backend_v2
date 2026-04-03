import { z } from 'zod';

/**************************************************************
* @description: Aquí definimos la "forma" de los datos.
***************************************************************/


export const CreateProductSchema = z.object({
	name: z.string({ message: "El nombre del producto debe superar los 5 caracteres" }).min(5),
	sku: z.string({ message: "El SKU debe ser valido" }).min(8),
	price: z.number({ message: "El precio debe ser un número positivo" }).positive(),
	stock: z.number({ message: "El stock debe ser un número entero no negativo" }).int().nonnegative().default(0),
	description: z.string({ message: "La descripción es obligatoria" }),
	isActive: z.boolean().default(true),
});

// Esquema para el BODY del PUT (Hacemos que todos los campos sean opcionales)
export const UpdateProductSchema = CreateProductSchema.partial();

// Esquema para los PARAMS (Validamos que el id de la URL sea un UUID)
export const ProductParamsSchema = z.object({
	id: z.string().uuid({ message: "El ID debe ser un UUID válido" }) 
});

// Esquema para el BODY del DELETE (Solo necesitamos validar el ID, pero lo dejamos aquí por si queremos usarlo en el futuro)
export const DeleteProductSchema = z.object({
	id: z.string().uuid({ message: 'El ID debe ser un UUID válido' }),
});

export const DeleteQuerySchema = z.object({
	isDeleteLogic: z.enum(['true', 'false']).optional().default('false'),
});

// 👇 NUEVO: Este es el que describe cómo SALE el producto (la respuesta)
export const ProductResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	sku: z.string(),
	// Usamos coerce para que si llega un objeto Decimal de Prisma, lo transforme a número o string
	price: z.preprocess((val) => Number(val), z.number()),
	stock: z.number(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	// Nos aseguramos de que las fechas se serialicen correctamente como strings ISO
	createdAt: z.coerce.string(),
	updatedAt: z.coerce.string(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;
export type DeleteProductInput = z.infer<typeof DeleteProductSchema>;
export type DeleteQueryInput = z.infer<typeof DeleteQuerySchema>;
