import { z } from "zod";

const UnitEnum = z.enum(["UNIT", "KG", "G", "L", "ML", "PACKAGE", "BOX"]);

const productFields = {
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  categoryId: z.string().uuid("Categoria inválida"),
  unit: UnitEnum.default("UNIT"),
  averageCost: z.number().min(0, "Custo não pode ser negativo").default(0),
  salePrice: z
    .number()
    .min(0, "Preço de venda não pode ser negativo")
    .optional()
    .nullable(),
  minimumStock: z.number().min(0, "Estoque mínimo não pode ser negativo").default(0),
};

export const createProductSchema = z.object(productFields);
export const updateProductSchema = z.object(productFields).partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export { UnitEnum };
