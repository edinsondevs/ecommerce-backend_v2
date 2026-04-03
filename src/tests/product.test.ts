import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import app from '../app'; // Importamos la instancia de tu servidor
import { ProductService } from '../services/product.service';

interface Product {
	id: string;
	name: string;
	sku: string;
	price: Decimal;
	stock: number;
	description: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

describe('--------------------          ----------------------------', () => {
	describe('✅🎉 MÓDULO DE PRODUCTOS: CASOS EXITOSOS 🎉✅', () => {
		it.skip('1. Debería crear un producto correctamente con datos válidos', async () => {
			// 1. Generamos un SKU único y dinámico para que NUNCA choque en la base de datos
			const uniqueSku = `MOU${Math.floor(10000 + Math.random() * 90000)}`;

			// Usamos el superpoder .inject() de Fastify
			const response = await app.inject({
				method: 'POST',
				url: '/api/products',
				payload: {
					name: 'Mouse Gamer',
					sku: uniqueSku, // 8 caracteres, correcto.
					price: 30, // Precio válido
					stock: 20,
					description:
						'Mouse gamer con iluminación RGB y alta precisión',
					isActive: true,
				},
			});

			expect(response.statusCode).toBe(201); // Created

			// Convertimos la respuesta a un objeto de JavaScript
			const body = JSON.parse(response.payload);

			// 5. Validamos que lo que nos devuelve la base de datos sea EXACTAMENTE lo que enviamos
			expect(body.data.name).toBe('Mouse Gamer');
			expect(body.data.sku).toBe(uniqueSku);
			expect(Number(body.data.price)).toBe(30); // Prisma a veces devuelve Decimal como string, así que lo forzamos a número por si acaso.
			expect(body.data.id).toBeDefined(); // Verificamos que Prisma le asignó un ID
		});

		it('2. Debería crear un producto exitosamente (SIMULADO)', async () => {
			// 1. Interceptamos el método 'create' de nuestro servicio y le decimos que devuelva una promesa resuelta con datos falsos.
			const mockCreate = vi
				.spyOn(ProductService, 'create')
				.mockResolvedValue({
					id: '123e4567-e89b-12d3-a456-426614174000',
					name: 'Mouse Gamer',
					sku: 'MOU12345', // ✅ 8 CARACTERES EXACTOS
					price: new Decimal(30),
					stock: 20,
					description: 'Mouse gamer con iluminación RGB y alta precisión',
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);

			// 2. Inyectamos la petición normalmente
			const response = await app.inject({
				method: 'POST',
				url: '/api/products',
				payload: {
					name: 'Mouse Gamer',
					sku: '4f20ff23-73b2-40cd-a9aa-729b7032f60a',
					price: 30,
					stock: 20,
					description: 'Mouse gamer con iluminación RGB y alta precisión',
				},
			});

			// 3. Verificaciones de Fastify/Zod
			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000'); // Comprobamos que nos devolvió el ID simulado

			// 4. Verificamos que nuestro espía realmente detuvo la petición
			expect(mockCreate).toHaveBeenCalled();

			// 5. IMPORTANTE: Limpiamos el espía para que no afecte a otros tests
			mockCreate.mockRestore();
		});

		it('3. Debería listar solo productos activos', async () => {
			const mockFind = vi
				.spyOn(ProductService, 'findByStock')
				.mockResolvedValue([
						{
							id: '123e4567-e89b-12d3-a456-426614174000',
							name: 'Pro 1',
							stock: 50,
							sku: 'SKU00001',
							price: new Decimal(10),
							description: '',
							isActive: true,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					] as Product[]);

			// // 1. Inyectamos la petición para listar productos
			const response = await app.inject({
				method: 'GET',
				url: '/api/products',
				query: { stock: '10' }, // Ejemplo de query para filtrar por stock (opcional)
			});

			expect(response.statusCode).toBe(200); // Verificamos que la respuesta sea exitosa

			// // 2. Parseamos la respuesta y verificamos que solo nos devuelva productos activos
			const body = JSON.parse(response.payload);
			expect(body.data.length).toBe(1); // Solo debería devolver 1 producto
			expect(mockFind).toHaveBeenCalledWith(10);
			mockFind.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});

		it('4. Debería actualizar un producto correctamente', async () => {
			const productId = '4f20ff23-73b2-40cd-a9aa-729b7032f60a';
			// 1. Primero, creamos un producto para tener un ID válido
			const mockUpdate = vi
				.spyOn(ProductService, 'update')
				.mockResolvedValue({
					id: productId,
					name: 'Mouse Gamer Pro',
					sku: 'MOU123',
					price: new Decimal(50),
					stock: 20,
					description: 'Mouse gamer con iluminación RGB y alta precisión',
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);

			// 2. Inyectamos la petición de actualización
			const response = await app.inject({
				method: 'PUT',
				url: `/api/products/${productId}`,
				payload: {
					name: 'Mouse Gamer Pro',
					price: 50,
				},
			});

			// 3. Verificaciones
			expect(response.statusCode).toBe(200);

			// 4. Parseamos la respuesta y verificamos que los datos actualizados sean correctos
			const body = JSON.parse(response.payload);
			expect(body.data.name).toBe('Mouse Gamer Pro');
			expect(Number(body.data.price)).toBe(50);

			// 5. LIMPIEZA
			mockUpdate.mockRestore();
		});

		it('5. Debería eliminar un producto correctamente', async () => {
			// 1. Primero, creamos un producto para tener un ID válido
			const productId = '4f20ff23-73b2-40cd-a9aa-729b7032f60a';
			// 2. Interceptamos el método 'delete' de nuestro servicio para simular la eliminación
			const mockDelete = vi
				.spyOn(ProductService, 'delete')
				.mockResolvedValue({
					id: productId,
					name: 'Mouse Gamer',
					sku: 'MOU123',
					price: new Decimal(30),
					stock: 20,
					description: 'Mouse gamer con iluminación RGB y alta precisión',
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			// 3. Inyectamos la petición de eliminación
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/products/${productId}`,
			});
			// 4. Verificaciones
			expect(response.statusCode).toBe(200);

			// Parseamos la respuesta y verificamos que nos devolvió el producto eliminado
			const body = JSON.parse(response.payload);
			expect(body.data.id).toBe(productId); // Verificamos que nos devolvió el producto eliminado

			// 5. IMPORTANTE: Limpiamos el espía para que no afecte a otros tests
			mockDelete.mockRestore();
		});

		it('6. Debería obtener un producto por su ID', async () => {
			const productId = '4f20ff23-73b2-40cd-a9aa-729b7032f60a';
			// 1. Interceptamos el método 'getById' de nuestro servicio para simular la obtención del producto
			const mockGetById = vi
				.spyOn(ProductService, 'getById')
				.mockResolvedValue({
					id: productId,
					name: 'Mouse Gamer Pro',
					sku: 'MOU123',
					price: new Decimal(50),
					stock: 20,
					description: 'Mouse gamer con iluminación RGB y alta precisión',
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);
			// 2. Inyectamos la petición para obtener el producto por su ID
			const response = await app.inject({
				method: 'GET',
				url: `/api/products/${productId}`,
			});
			
			// 3. Verificaciones
			expect(response.statusCode).toBe(200);
			// 4. Parseamos la respuesta y verificamos que los datos del producto sean correctos
			const body = JSON.parse(response.payload);
			
			expect(body.data.id).toBe(productId);
			expect(body.data.name).toBe('Mouse Gamer Pro');
			expect(Number(body.data.price)).toBe(50);

			mockGetById.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});

	});
});

describe('--------------------          ----------------------------', () => {
	describe('⛔❌ MÓDULO DE PRODUCTOS: ERRORES Y VALIDACIONES ❌⛔', () => {
		// 1. Antes de correr las pruebas, esperamos a que Fastify cargue sus plugins (Swagger, Prisma, etc.)
		beforeAll(async () => {
			await app.ready();
		});

		// 2. Al terminar todas las pruebas, cerramos la instancia para liberar la memoria
		afterAll(async () => {
			await app.close();
		});

		// 3. Ahora sí, empezamos a probar los casos de error y validación
		it('7. Error 400 si intentamos CREAR un producto con precio negativo', async () => {
			// Usamos el superpoder .inject() de Fastify
			const response = await app.inject({
				method: 'POST',
				url: '/api/products',
				payload: {
					name: 'Teclado Gamer',
					sku: 'TECLADO1', // 8 caracteres, correcto.
					price: -50, // ❌ PRECIO NEGATIVO (Aquí debería saltar Zod)
					stock: 10,
				},
			});

			// 4. Afirmaciones (Expectations)
			// Esperamos que Fastify/Zod nos bloquee con un código 400 (Bad Request)
			expect(response.statusCode).toBe(400);

			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe('error');
			expect(body.message).toBe('Datos de entrada inválidos');
		});

		it('8. Error 400 si intentamos CREAR un producto con un SKU invalido', async () => {
			// 1. creamos un SKU inválido (menos de 8 caracteres)
			const invalidSku = 'RRRFTG5'; // Solo 6 caracteres, debería ser 8

			// 2. creamos la petición con el SKU inválido
			const response = await app.inject({
				method: 'POST',
				url: '/api/products',
				payload: {
					name: 'Teclado Gamer',
					sku: invalidSku, // SKU inválido
					price: 50,
					stock: 10,
					description: 'Teclado mecánico con retroiluminación RGB',
				},
			});

			expect(response.statusCode).toBe(400); // Esperamos un error de validación porque el SKU no cumple con la longitud mínima de 8 caracteres
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe('error');
			expect(body.message).toBe('Datos de entrada inválidos');
		});

		it('9. Error 409 si intentamos CREAR un producto con un SKU existente', async () => {
			// 1. creamos un SKU inválido (menos de 8 caracteres)
			const invalidSku = 'RRRF345FTG542'; // Solo 6 caracteres, debería ser 8

			// 2. creamos la petición con el SKU inválido
			const response = await app.inject({
				method: 'POST',
				url: '/api/products',
				payload: {
					name: 'Teclado Gamer',
					sku: invalidSku, // SKU inválido
					price: 50,
					stock: 10,
					description: 'Teclado mecánico con retroiluminación RGB',
				},
			});

			expect(response.statusCode).toBe(409); // Esperamos un error de validación porque el SKU ya existe en la base de datos
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe('error');
			expect(body.message).toBe(
				'Conflicto: El registro ya existe en la base de datos.',
			);
		});

		it('10. Error 404 si intentamos BORRAR un producto que no existe', async () => {
			const nonExistentId = '4f20ff23-73b2-40cd-a9aa-729b7032f60b'; // ID que no existe en la base de datos
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/products/${nonExistentId}`,
			});
			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe('error');
			expect(body.message).toBe('El recurso solicitado no existe.');
		});

		it('11. Error 404 si no ENCONTRAMOS un producto', async () => {
			const nonExistentId = '4f20ff23-73b2-40cd-a9aa-729b7032f60b'; // ID que no existe en la base de datos
			const response = await app.inject({
				method: 'GET',
				url: `/api/products/${nonExistentId}`,
			});
			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			
			expect(body.status).toBe('error');
			expect(body.message).toBe('Producto no encontrado');
		})
	});
});
