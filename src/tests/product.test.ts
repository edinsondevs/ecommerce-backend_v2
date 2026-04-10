import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	vi,
	beforeEach,
} from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import app from "../app"; // Importamos la instancia de tu servidor
import { ProductService } from "../services/product.service";
import prisma from "../config/prisma";

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

describe("--------------------          ----------------------------", () => {
	describe("✅🎉 MÓDULO DE PRODUCTOS: CASOS EXITOSOS 🎉✅", () => {
		let testToken: string; // 👈 1. Creamos la variable para guardar nuestro pase VIP

		// 👇 2. Generamos el token ANTES de que corran todos los tests de este bloque
		beforeAll(async () => {
			// 👇 2. ESTA ES LA MAGIA: Esperamos a que Fastify cargue todos los plugins
			await app.ready();

			// Firmamos un token con un usuario de prueba (Rol ADMIN para que no tenga bloqueos)
			testToken = app.jwt.sign({
				id: "admin-uuid-123",
				email: "admin@test.com",
				role: "ADMIN",
			});
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});
		it.skip("1. Debería crear un producto correctamente con datos válidos", async () => {
			// 1. Generamos un SKU único y dinámico para que NUNCA choque en la base de datos
			const uniqueSku = `MOU${Math.floor(10000 + Math.random() * 90000)}`;

			// Usamos el superpoder .inject() de Fastify
			const response = await app.inject({
				method: "POST",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Mouse Gamer",
					sku: uniqueSku, // 8 caracteres, correcto.
					price: 30, // Precio válido
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
				},
			});

			expect(response.statusCode).toBe(201); // Created

			// Convertimos la respuesta a un objeto de JavaScript
			const body = JSON.parse(response.payload);

			// 5. Validamos que lo que nos devuelve la base de datos sea EXACTAMENTE lo que enviamos
			expect(body.data.name).toBe("Mouse Gamer");
			expect(body.data.sku).toBe(uniqueSku);
			expect(Number(body.data.price)).toBe(30); // Prisma a veces devuelve Decimal como string, así que lo forzamos a número por si acaso.
			expect(body.data.id).toBeDefined(); // Verificamos que Prisma le asignó un ID
		});

		it("2. Debería crear un producto exitosamente (SIMULADO)", async () => {
			// 1. Interceptamos el método 'create' de nuestro servicio y le decimos que devuelva una promesa resuelta con datos falsos.
			const mockCreate = vi
				.spyOn(ProductService, "create")
				.mockResolvedValue({
					id: "123e4567-e89b-12d3-a456-426614174000",
					name: "Mouse Gamer",
					sku: "MOU12345", // ✅ 8 CARACTERES EXACTOS
					price: new Decimal(30),
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);

			// 2. Inyectamos la petición normalmente
			const response = await app.inject({
				method: "POST",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Mouse Gamer",
					sku: "4f20ff23-73b2-40cd-a9aa-729b7032f60a",
					price: 30,
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
				},
			});

			// 3. Verificaciones de Fastify/Zod
			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.data.id).toBe("123e4567-e89b-12d3-a456-426614174000"); // Comprobamos que nos devolvió el ID simulado

			// 4. Verificamos que nuestro espía realmente detuvo la petición
			expect(mockCreate).toHaveBeenCalled();

			// 5. IMPORTANTE: Limpiamos el espía para que no afecte a otros tests
			mockCreate.mockRestore();
		});

		it("3. Debería listar solo productos activos con stock disponible", async () => {
			const mockFind = vi
				.spyOn(ProductService, "findByStock")
				.mockResolvedValue([
					{
						id: "123e4567-e89b-12d3-a456-426614174000",
						name: "Pro 1",
						stock: 50,
						sku: "SKU00001",
						price: new Decimal(10),
						description: "",
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				] as Product[]);

			// // 1. Inyectamos la petición para listar productos
			const response = await app.inject({
				method: "GET",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				query: { stock: "10" }, // Ejemplo de query para filtrar por stock (opcional)
			});

			expect(response.statusCode).toBe(200); // Verificamos que la respuesta sea exitosa

			// // 2. Parseamos la respuesta y verificamos que solo nos devuelva productos activos
			const body = JSON.parse(response.payload);
			expect(body.data.length).toBe(1); // Solo debería devolver 1 producto
			expect(mockFind).toHaveBeenCalledWith(10);

			mockFind.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});

		it("4. Debería listar solo productos activos", async () => {
			// 1. Inyectamos la petición para listar productos
			const mockFind = vi
				.spyOn(ProductService, "list")
				.mockResolvedValue([
					{
						id: "123e4567-e89b-12d3-a456-426614174933",
						name: "Pro Max 15",
						stock: 25,
						sku: "SKU54321",
						price: new Decimal(10),
						description: "",
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
					{
						id: "123e4567-e89b-12d3-a456-426614174001",
						name: "Pro Max 17",
						stock: 40,
						sku: "SKU98765",
						price: new Decimal(10),
						description: "",
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
					{
						id: "123e4567-e89b-12d3-a456-426614174430",
						name: "Pro 15",
						stock: 90,
						sku: "SKU00001",
						price: new Decimal(10),
						description: "",
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				] as Product[]);

			const response = await app.inject({
				method: "GET",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});
			// 2. Verificaciones
			expect(response.statusCode).toBe(200); // Verificamos que la respuesta sea exitosa

			// // 3. Parseamos la respuesta y verificamos que solo nos devuelva productos activos
			const body = JSON.parse(response.payload);

			expect(ProductService.list).toHaveBeenCalled(); // Verificamos que se llamó al método list de nuestro servicio
			expect(Array.isArray(body.data)).toBe(true); // Verificamos que nos devuelva un array de productos
			mockFind.mockRestore(); // Limpiamos
		});

		it("5. Debería actualizar un producto correctamente", async () => {
			const productId = "4f20ff23-73b2-40cd-a9aa-729b7032f60a";
			// 1. Primero, creamos un producto para tener un ID válido
			const mockUpdate = vi
				.spyOn(ProductService, "update")
				.mockResolvedValue({
					id: productId,
					name: "Mouse Gamer Pro",
					sku: "MOU123",
					price: new Decimal(50),
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);

			// 2. Inyectamos la petición de actualización
			const response = await app.inject({
				method: "PUT",
				url: `/api/products/${productId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Mouse Gamer Pro",
					price: 50,
				},
			});

			// 3. Verificaciones
			expect(response.statusCode).toBe(200);

			// 4. Parseamos la respuesta y verificamos que los datos actualizados sean correctos
			const body = JSON.parse(response.payload);
			expect(body.data.name).toBe("Mouse Gamer Pro");
			expect(Number(body.data.price)).toBe(50);

			// 5. LIMPIEZA
			mockUpdate.mockRestore();
		});

		it("6. Debería eliminar un producto correctamente", async () => {
			// 1. Primero, creamos un producto para tener un ID válido
			const productId = "4f20ff23-73b2-40cd-a9aa-729b7032f60a";
			// 2. Interceptamos el método 'delete' de nuestro servicio para simular la eliminación
			const mockDelete = vi
				.spyOn(ProductService, "delete")
				.mockResolvedValue({
					id: productId,
					name: "Mouse Gamer",
					sku: "MOU123",
					price: new Decimal(30),
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			// 3. Inyectamos la petición de eliminación
			const response = await app.inject({
				method: "DELETE",
				url: `/api/products/${productId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});
			// 4. Verificaciones
			expect(response.statusCode).toBe(200);

			// Parseamos la respuesta y verificamos que nos devolvió el producto eliminado
			const body = JSON.parse(response.payload);
			expect(body.data.id).toBe(productId); // Verificamos que nos devolvió el producto eliminado

			// 5. IMPORTANTE: Limpiamos el espía para que no afecte a otros tests
			mockDelete.mockRestore();
		});

		it("6. Debería eliminar un producto correctamente", async () => {
			// 1. Primero, creamos un producto para tener un ID válido
			const productId = "4f20ff23-73b2-40cd-a9aa-729b7032f60a";
			// 2. Interceptamos el método 'delete' de nuestro servicio para simular la eliminación
			const mockDelete = vi
				.spyOn(ProductService, "delete")
				.mockResolvedValue({
					id: productId,
					name: "Mouse Gamer",
					sku: "MOU123",
					price: new Decimal(30),
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			// 3. Inyectamos la petición de eliminación
			const response = await app.inject({
				method: "DELETE",
				url: `/api/products/${productId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				query: { isDeleteLogic: "true" }, // Simulamos eliminación lógica
			});
			// 4. Verificaciones
			expect(response.statusCode).toBe(200);

			// Parseamos la respuesta y verificamos que nos devolvió el producto eliminado
			const body = JSON.parse(response.payload);
			expect(body.data.id).toBe(productId); // Verificamos que nos devolvió el producto eliminado
			expect(body.message).toBe(
				"Producto enviado a la papelera (Soft Delete)",
			); // Verificamos que el mensaje sea el correcto para eliminación lógica
			// 5. IMPORTANTE: Limpiamos el espía para que no afecte a otros tests
			mockDelete.mockRestore();
		});

		it("7. Debería obtener un producto por su ID", async () => {
			const productId = "4f20ff23-73b2-40cd-a9aa-729b7032f60a";
			// 1. Interceptamos el método 'getById' de nuestro servicio para simular la obtención del producto
			const mockGetById = vi
				.spyOn(ProductService, "getById")
				.mockResolvedValue({
					id: productId,
					name: "Mouse Gamer Pro",
					sku: "MOU123",
					price: new Decimal(50),
					stock: 20,
					description:
						"Mouse gamer con iluminación RGB y alta precisión",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				} as Product);
			// 2. Inyectamos la petición para obtener el producto por su ID
			const response = await app.inject({
				method: "GET",
				url: `/api/products/${productId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});

			// 3. Verificaciones
			expect(response.statusCode).toBe(200);
			// 4. Parseamos la respuesta y verificamos que los datos del producto sean correctos
			const body = JSON.parse(response.payload);

			expect(body.data.id).toBe(productId);
			expect(body.data.name).toBe("Mouse Gamer Pro");
			expect(Number(body.data.price)).toBe(50);

			mockGetById.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});
	});
});

describe("--------------------          ----------------------------", () => {
	describe("⛔❌ MÓDULO DE PRODUCTOS: ERRORES Y VALIDACIONES ❌⛔", () => {
		let testToken: string; // 👈 1. Creamos la variable para guardar nuestro pase VIP

		beforeEach(() => {
			vi.clearAllMocks();
		});

		// 1. Antes de correr las pruebas, esperamos a que Fastify cargue sus plugins (Swagger, Prisma, etc.)
		beforeAll(async () => {
			await app.ready();
			// 👇 Generamos el token ANTES de que corran todos los tests de este bloque
			testToken = app.jwt.sign({
				id: "admin-uuid-123",
				email: "admin@test.com",
				role: "ADMIN",
			});
		});

		// 2. Al terminar todas las pruebas, cerramos la instancia para liberar la memoria
		afterAll(async () => {
			await app.close();
		});

		// 3. Ahora sí, empezamos a probar los casos de error y validación
		it("8. Error 400 si intentamos CREAR un producto con precio negativo", async () => {
			// Usamos el superpoder .inject() de Fastify
			const response = await app.inject({
				method: "POST",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Teclado Gamer",
					sku: "TECLADO1", // 8 caracteres, correcto.
					price: -50, // ❌ PRECIO NEGATIVO (Aquí debería saltar Zod)
					stock: 10,
				},
			});

			// 4. Afirmaciones (Expectations)
			// Esperamos que Fastify/Zod nos bloquee con un código 400 (Bad Request)
			expect(response.statusCode).toBe(400);

			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe("error");
			expect(body.message).toBe("Datos de entrada inválidos");
		});

		it("9. Error 400 si intentamos CREAR un producto con un SKU invalido", async () => {
			// 1. creamos un SKU inválido (menos de 8 caracteres)
			const invalidSku = "RRRFTG5"; // Solo 6 caracteres, debería ser 8

			// 2. creamos la petición con el SKU inválido
			const response = await app.inject({
				method: "POST",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Teclado Gamer",
					sku: invalidSku, // SKU inválido
					price: 50,
					stock: 10,
					description: "Teclado mecánico con retroiluminación RGB",
				},
			});

			expect(response.statusCode).toBe(400); // Esperamos un error de validación porque el SKU no cumple con la longitud mínima de 8 caracteres
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe("error");
			expect(body.message).toBe("Datos de entrada inválidos");
		});

		it("10. Error 409 si intentamos CREAR un producto con un SKU existente", async () => {
			// 1. creamos un SKU inválido (SKU-DUPLICADO)
			const invalidSku = "SKU-DUPLICADO";

			// 1. Creamos un error REAL de JavaScript
			const prismaError = new Error("Error simulado de Prisma");
			// 2. Le inyectamos las propiedades que Prisma enviaría
			(prismaError as any).code = "P2002";
			(prismaError as any).meta = { target: ["sku"] };

			// 3. Hacemos que el espía rechace la promesa con ese error
			const mockCreate = vi
				.spyOn(ProductService, "create")
				.mockRejectedValue(prismaError);

			// 2. creamos la petición con el SKU inválido
			const response = await app.inject({
				method: "POST",
				url: "/api/products",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Teclado Gamer",
					sku: invalidSku, // SKU inválido
					price: 50,
					stock: 10,
					description: "Teclado mecánico con retroiluminación RGB",
				},
			});

			expect(response.statusCode).toBe(409); // Esperamos un error de validación porque el SKU ya existe en la base de datos
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe("error");
			expect(body.message).toBe(
				"Conflicto: El registro ya existe en la base de datos.",
			);
			mockCreate.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});

		it("11. Error 404 si intentamos BORRAR un producto que no existe", async () => {
			const nonExistentId = "4f20ff23-73b2-40cd-a9aa-729b7032f60b"; // ID que no existe en la base de datos

			// 1. Interceptamos el metodo delete del servicio
			const mockDelete = vi.spyOn(ProductService, 'delete').mockRejectedValue({
				code: "P2025",
			} as any);
			const response = await app.inject({
				method: "DELETE",
				url: `/api/products/${nonExistentId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});
			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);
			expect(body.status).toBe("error");
			expect(body.message).toBe("El recurso solicitado no existe.");
			mockDelete.mockRestore(); 
		});

		it("12. Error 404 si no ENCONTRAMOS un producto", async () => {
			const nonExistentId = "4f20ff23-73b2-40cd-a9aa-729b7032f60b"; // ID que no existe en la base de datos
			// Interceptamos el metodo getById del servicio
			const mockGetById = vi.spyOn(ProductService, 'getById').mockRejectedValue({
				code: "P2025",
			} as any);
			const response = await app.inject({
				method: "GET",
				url: `/api/products/${nonExistentId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});
			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);

			expect(body.status).toBe("error");
			expect(body.message).toBe("El recurso solicitado no existe.");
			mockGetById.mockRestore();
		});

		it("13. Error 404 si no EXISTE AL MODIFICARLO un producto", async () => {
			const nonExistentId = "4f20ff23-73b2-40cd-a9aa-729b7032f60b"; // ID que no existe en la base de datos
			const mockGetById = vi
				.spyOn(ProductService, "update")
				.mockResolvedValue(null as any); // Simulamos que no encontramos el producto

			const response = await app.inject({
				method: "PUT",
				url: `/api/products/${nonExistentId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Producto Actualizado",
				},
			});

			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);

			expect(body.status).toBe("error");
			expect(body.message).toBe("Producto no encontrado");

			mockGetById.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});

		it("14. Error 404 si no EXISTE un producto AL QUERER BORRARLO", async () => {
			const nonExistentId = "4f20ff23-73b2-40cd-a9aa-729b7032f60b"; // ID que no existe en la base de datos
			const mockGetById = vi
				.spyOn(ProductService, "delete")
				.mockResolvedValue(null as any); // Simulamos que no encontramos el producto

			const response = await app.inject({
				method: "DELETE",
				url: `/api/products/${nonExistentId}`,
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				payload: {
					name: "Producto Actualizado",
				},
			});

			expect(response.statusCode).toBe(404);
			// Podemos parsear la respuesta y asegurarnos de que nuestro errorHandler funcionó
			const body = JSON.parse(response.payload);

			expect(body.status).toBe("error");
			expect(body.message).toBe("Producto no encontrado");

			mockGetById.mockRestore(); // Limpiamos el espía para que no afecte a otros tests
		});
	});
});

describe("--------------------          ----------------------------", () => {
	describe("🧪 PRUEBAS UNITARIAS: Lógica del Servicio de Productos (Mocks de Prisma) 🧪", () => {
		it("15. Debería actualizar un producto en la base de datos (Cobertura del método update)", async () => {
			// 1. Espiamos a PRISMA (el escalón más bajo), NO al servicio
			const mockPrismaUpdate = vi
				.spyOn(prisma.product, "update")
				.mockResolvedValue({
					id: "uuid-123",
					name: "Producto Actualizado por Prisma",
				} as any);

			// 2. Ejecutamos el método REAL de nuestro servicio
			const result = await ProductService.update("uuid-123", {
				name: "Producto Actualizado por Prisma",
			});

			// 3. Verificamos que el servicio armó bien la consulta para Prisma
			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "uuid-123" },
				data: { name: "Producto Actualizado por Prisma" },
			});

			// Verificamos que nos devuelva lo correcto
			expect(result.name).toBe("Producto Actualizado por Prisma");

			mockPrismaUpdate.mockRestore();
		});

		it("16. Debería buscar productos filtrados por stock (Cobertura del método findByStock)", async () => {
			// 1. Espiamos el findMany de PRISMA
			const mockPrismaFindMany = vi
				.spyOn(prisma.product, "findMany")
				.mockResolvedValue([
					{ id: "1", name: "Mouse", stock: 50, isActive: true },
					{ id: "2", name: "Teclado", stock: 20, isActive: true },
				] as any);

			// 2. Ejecutamos el método REAL de nuestro servicio (Buscamos > 10 de stock)
			const result = await ProductService.findByStock(10);

			// 3. Verificamos que el servicio le haya pasado las condiciones correctas a Prisma
			expect(mockPrismaFindMany).toHaveBeenCalledWith({
				where: {
					stock: { gt: 10 }, // greater than (mayor que)
					isActive: true,
				},
			});

			// Verificamos el resultado
			expect(result.length).toBe(2);

			mockPrismaFindMany.mockRestore();
		});
		it("17. Debería aplicar un borrado lógico (soft delete) al invocar el servicio con isDeleteLogic", async () => {
			// 1. Espiamos el método 'update' de PRISMA (que es el que se usa en el borrado lógico)
			const mockPrismaUpdate = vi
				.spyOn(prisma.product, "update")
				.mockResolvedValue({
					id: "uuid-123",
					name: "Producto a borrar",
					isActive: false, // Simulamos que la base de datos lo desactivó
				} as any);

			// 2. Ejecutamos el método REAL de nuestro servicio, pasándole TRUE como segundo argumento
			const result = await ProductService.delete("uuid-123", true);

			// 3. Verificamos que el servicio armó correctamente la instrucción para desactivar
			expect(mockPrismaUpdate).toHaveBeenCalledWith({
				where: { id: "uuid-123" },
				data: { isActive: false }, // 👈 Verificamos que intente cambiar el estado, no borrar la fila
			});

			// Verificamos que el resultado refleje el cambio
			expect(result.isActive).toBe(false);

			// 4. Limpieza
			mockPrismaUpdate.mockRestore();
		});
	});
});
