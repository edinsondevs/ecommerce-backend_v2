import prisma from '../config/prisma.js';

/**************************************************************
* @description: Lógica de Negocio (Service + Route)
* Aquí es donde se implementa la lógica de negocio, interactuando con la base de datos a través de Prisma.
* @function ProductService: Un objeto que contiene métodos para crear y listar productos.
***************************************************************/

export const ProductService = {
	// 1. Crear un nuevo producto
	create: async (data: any) => {
		return await prisma.product.create({ data });
	},
	// 2. Listar todos los productos activos
	list: async () => {
		return await prisma.product.findMany({ where: { isActive: true } });
	},
	// 3. Actualizar un producto por su ID
	update: async(id: string, data: any) => {
		return await prisma.product.update({
			where: { id },
			data,
		});
	},
	// 4. Obtener un producto por su ID 
	getById: async (id: string) => {
		return await prisma.product.findUnique({
			where: { id },
		})
	},

	// 5. Buscar productos por stock (Ejemplo de método adicional para demostrar filtrado)
	findByStock: async (stock: number) => {
		return await prisma.product.findMany({ 
			where: { 
				stock: { gt: stock }, 
				isActive: true // Solo productos activos
			}
		});
	},

	// 6. Eliminar un producto por su ID (con opción de eliminación lógica)
	delete: async (id: string, isDeleteLogic: boolean) => {
		if (isDeleteLogic) {
			return await prisma.product.update({
				where: { id },
				data: { isActive: false },
			});
		}else{
			return await prisma.product.delete({ where: { id } });
		}
	}
};
