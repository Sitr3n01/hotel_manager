import { z } from "zod";

const optionalString = (max: number, message: string) =>
  z.string().max(max, message).optional().nullable().or(z.literal(""));

const productCategoryFields = {
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: optionalString(500, "Descrição muito longa"),
};

export const createProductCategorySchema = z.object(productCategoryFields);
export const updateProductCategorySchema = z.object(productCategoryFields).partial();

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
