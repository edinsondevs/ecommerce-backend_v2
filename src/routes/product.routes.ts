import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CreateProductSchema, DeleteProductSchema, DeleteQuerySchema, ProductParamsSchema, ProductResponseSchema, UpdateProductSchema } from '../schemas/product.schema.js';
import { ProductService } from '../services/product.service.js';
import z from 'zod';

/*******************************************************************************
 * @description: Rutas de Producto (El Punto de Entrada para las Operaciones de Producto)
 * Aquí definimos las rutas relacionadas con los productos, utilizando Fastify y Zod para validación.
 * @function productRoutes: Una función que recibe una instancia de Fastify y registra las rutas de producto.
 *******************************************************************************/

// Fastify agrupa las rutas. 'server' es la instancia de Fastify en este bloque.
export async function productRoutes(app: FastifyInstance) {
	const server = app.withTypeProvider<ZodTypeProvider>();

	// * POST /api/products con validación automática
	server.post('/products', {
			// 👇 El Guardia verifica el token ANTES de validar los datos
			onRequest: [server.requireAdmin],
			schema: {
				summary: 'Creación de Productos',
				description:
					'Crea un nuevo producto en el inventario validando el SKU único y el stock inicial.',
				tags: ['Inventario'], // Esto agrupa las rutas en secciones
				// 👇 Le decimos a Swagger que obligue a usar el candadito aquí
				security: [{ bearerAuth: [] }],
				body: CreateProductSchema,
				response: {
					201: z.object({
						data: ProductResponseSchema, // Tu esquema de respuesta
					}),
					400: z.object({
						status: z.enum(['error']),
						message: z.string(),
						errors: z
							.array(
								z.object({
									field: z.string(),
									message: z.string(),
								}),
							)
							.optional(), // Detalles de errores de validación
					}),
				},
			}, // Fastify usará este esquema para validar el cuerpo de la solicitud
		},
		async (request, response) => {
			const product = await ProductService.create(request.body);
			return response.code(201).send({ data: product });
		},
	);

	// * GET /api/products - Listar productos activos
	server.get('/products', {
		// 👇 El Guardia verifica el token ANTES de validar los datos
		onRequest: [server.authenticate],
		schema: { 
			// 👇 Le decimos a Swagger que obligue a usar el candadito aquí
			security: [{ bearerAuth: [] }],
			summary: 'Listar y Filtrar Productos',
			description: 'Retorna todos los productos activos. Permite filtrar por stock mínimo usando query params.',
			tags: ['Inventario'],
			querystring: z.object({
				stock: z.coerce.number().int().nonnegative().optional() // Ejemplo de validación adicional para filtrar por stock (opcional)
			}),
			response: {
				200: z.object({
					data: z.array(ProductResponseSchema), // Respuesta con un array de productos
				}),
				400: z.object({
					status: z.enum(['error']),
					message: z.string(),
				})
			}
		}
	}, async (request, response) => {
		const { stock } = request.query;
		const products = stock !== undefined ? await ProductService.findByStock(Number(stock)) : await ProductService.list()
		
		return response.code(200).send({data: products});
	});

	// * GET /api/products/:id con validación de params
	server.get('/products/:id', {
		// 👇 El Guardia verifica el token ANTES de validar los datos
		onRequest: [server.authenticate],
		schema: {
			// 👇 Le decimos a Swagger que obligue a usar el candadito aquí
			security: [{ bearerAuth: [] }],
			tags: ['Inventario'],
			summary: 'Obtener Detalles de un Producto',
			description: 'Retorna los detalles de un producto específico por su ID.',
			params: ProductParamsSchema, // Validamos que el ID sea correcto
			response: {
				200: z.object({
					data: ProductResponseSchema, // Respuesta con el producto encontrado
				}),
				404: z.object({
					status: z.enum(['error']),
					message: z.string(),
				})
			}
		}, 
	}, async (request, response) => {
		const { id } = request.params;
		
		const product = await ProductService.getById(id);
		if(!product){
			return response.code(404).send({ status: 'error', message: 'Producto no encontrado' });
		}
		return response.code(200).send({data: product})
	});

	// * PUT /api/products/:id con validación de params y body
	server.put('/products/:id', {
		// 👇 El Guardia verifica el token ANTES de validar los dato
		onRequest: [server.requireAdmin],
		schema: {
			security: [{ bearerAuth: [] }], // Requiere autenticación
			tags: ['Inventario'],
			summary: 'Actualizar un Producto',
			description: 'Actualiza los detalles de un producto existente. Permite modificar cualquier campo excepto el ID.',
			params: ProductParamsSchema,
			body: UpdateProductSchema,
			response: {
				200: z.object({
					data: ProductResponseSchema, // Respuesta con el producto actualizado
				}),
				404: z.object({
					status: z.enum(['error']),
					message: z.string(),
				})
			}
		}
	}, async (request, response) => {

		const { id } = request.params;

		const updatedProduct = await ProductService.update(id, request.body);

		if (!updatedProduct) {
			return response.code(404).send({ status: 'error', message: 'Producto no encontrado' });
		}
		return response.code(200).send({data: updatedProduct});
	});

	// * DELETE /api/products/:id con validación de params y body
	server.delete('/products/:id',{
		// 👇 El Guardia verifica el token ANTES de validar los datos
		onRequest: [server.requireAdmin],
		schema: {
			security: [{ bearerAuth: [] }], // Requiere autenticación
			tags: ['Inventario'],
			summary: 'Eliminar un Producto',
			description: 'Elimina un producto del inventario. Permite elegir entre eliminación lógica (marcar como inactivo) o eliminación física (borrar del sistema) mediante query params.',
			params: DeleteProductSchema,
			querystring: DeleteQuerySchema,
			response: {
				200: z.object({
					status: z.enum(['success', 'error']),
					message: z.string(),
					data: ProductResponseSchema.nullable(), // La respuesta puede incluir el producto eliminado o ser null
				}),
				404: z.object({
					status: z.enum(['error']),
					message: z.string(),
				}),
			},
		}
	}, async (request, response) => {
		const { id } = request.params;
		// Extraemos la bandera lógica de las variables de consulta (?isDeleteLogic=true)
		const { isDeleteLogic } = request.query;
		
		// Lo convertimos a un booleano estricto para nuestro servicio
        const isLogicBoolean = isDeleteLogic === 'true';

		// Aquí podríamos implementar la lógica para eliminar el producto (por ejemplo, marcarlo como inactivo)
		const deleteProduct = await ProductService.delete(id, isLogicBoolean);
		
		if (!deleteProduct) {
			return response
				.code(404)
				.send({ status: 'error', message: 'Producto no encontrado' });
		}

		return response.code(200).send({
			status: 'success',
			message: isLogicBoolean
				? 'Producto enviado a la papelera (Soft Delete)'
				: 'Producto destruido permanentemente (Hard Delete)',
			data: deleteProduct,
		});
	});
}
