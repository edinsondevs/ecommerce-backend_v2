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
	server.post(
		'/products',
		{
			schema: {
				// 👇 ESTO ES LO QUE BUSCAS
				summary: 'Creación de Productos',
				description:
					'Crea un nuevo producto en el inventario validando el SKU único y el stock inicial.',
				tags: ['Inventario'], // Esto agrupa las rutas en secciones
				body: CreateProductSchema,
				response: {
					201: z.object({
						data: ProductResponseSchema, // Tu esquema de respuesta
					}),
				},
			}, // Fastify usará este esquema para validar el cuerpo de la solicitud
		},
		async (request, response) => {
			// Si el código llega a esta línea, Fastify garantiza que request.body es PERFECTO.
			const product = await ProductService.create(request.body);
			return response.code(201).send({ data: product });
		},
	);

	// * GET /api/products - Listar productos activos
	server.get('/products', {
		schema: { 
			summary: 'Listar y Filtrar Productos',
			description: 'Retorna todos los productos activos. Permite filtrar por stock mínimo usando query params.',
			tags: ['Inventario'],
			querystring: z.object({
				stock: z.coerce.number().int().nonnegative().optional() // Ejemplo de validación adicional para filtrar por stock (opcional)
			}) 
		}
	}, async (request, response) => {
		const { stock } = request.query;
		const products = stock !== undefined ? await ProductService.findByStock(Number(stock)) : await ProductService.list()
		
		return response.code(200).send({data: products});
	});

	// * GET /api/products/:id con validación de params
	server.get('/products/:id', {
		schema: { 
			params: ProductParamsSchema, // Validamos que el ID sea correcto
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
		schema: { 
			params: ProductParamsSchema,
			body: UpdateProductSchema 
		}
	}, async (request, response) => {

		const { id } = request.params;

		const updatedProduct = await ProductService.update(id, request.body);
		
		if (!updatedProduct) {
			return response.code(404).send({ message: 'Producto no encontrado' });
		}
		return response.code(200).send({data: updatedProduct});
	});

	// * DELETE /api/products/:id con validación de params y body
	server.delete('/products/:id',{
		schema: { 
			params: DeleteProductSchema,
			querystring: DeleteQuerySchema
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
				.send({ message: 'Producto no encontrado' });
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
