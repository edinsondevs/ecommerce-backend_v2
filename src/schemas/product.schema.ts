import { z } from 'zod';

/**************************************************************
* @description: Aquí definimos la "forma" de los datos.
***************************************************************/


export const CreateProductSchema = z.object({
	name: z.string({ message: "El nombre del producto debe superar los 5 caracteres" }).min(5),
	// sku: z.string().length(8).toUpperCase(),
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

// Esquema para el BODY del DELETE con opción de eliminación lógica
// export const DeleteProductLogicSchema = z.object({
// 	isDeleteLogic: z.boolean().default(true), // Por defecto, hacemos eliminación lógica
// });

export const DeleteQuerySchema = z.object({
	isDeleteLogic: z.enum(['true', 'false']).optional().default('false'),
});

// export const DeleteProductSchema = ProductParamsSchema; // Para DELETE, solo necesitamos validar el ID

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductParams = z.infer<typeof ProductParamsSchema>;
export type DeleteProductInput = z.infer<typeof DeleteProductSchema>;
// export type DeleteProductLogicInput = z.infer<typeof DeleteProductLogicSchema>;
export type DeleteQueryInput = z.infer<typeof DeleteQuerySchema>;
