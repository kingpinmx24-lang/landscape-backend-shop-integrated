import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listInventory,
  getInventoryItemById,
  addInventoryItem,
  updateInventoryStock,
} from "../queries";
import { mockQueries } from "../db-mock";
import { getDb } from "../db";

/**
 * Router para manejo de inventario/tienda
 */
export const inventoryRouter = router({
  /**
   * Listar todos los artículos del inventario
   */
  list: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return await mockQueries.listInventory();
      return await listInventory();
    } catch (error) {
      console.error("[inventory.list] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list inventory",
      });
    }
  }),

  /**
   * Obtener un artículo específico
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        const item = db 
          ? await getInventoryItemById(input.id)
          : await mockQueries.getInventoryItemById(input.id);
          
        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Inventory item not found",
          });
        }
        return item;
      } catch (error) {
        console.error("[inventory.get] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get inventory item",
        });
      }
    }),

  /**
   * Agregar un nuevo artículo al inventario (con soporte para PNG)
   */
  add: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["flowering", "shrub", "tree", "groundcover", "decorative"]),
        imageUrl: z.string().url(),
        purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
        sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
        stock: z.number().int().nonnegative().default(0),
        region: z.string().optional(),
        climate: z.string().optional(),
        adultSize: z.object({
          height: z.number().positive(),
          width: z.number().positive(),
        }).optional(),
        spacing: z.string().regex(/^\d+(\.\d{1,2})?$/).default("1.00"),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const data = {
          name: input.name,
          type: input.type,
          imageUrl: input.imageUrl,
          purchasePrice: input.purchasePrice,
          sellingPrice: input.sellingPrice,
          stock: input.stock,
          region: input.region || null,
          climate: input.climate || null,
          adultSize: input.adultSize || null,
          spacing: input.spacing,
          metadata: input.metadata || null,
        };

        if (!db) return await mockQueries.addInventoryItem(data);
        return await addInventoryItem(data);
      } catch (error) {
        console.error("[inventory.add] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add inventory item",
        });
      }
    }),

  /**
   * Actualizar stock de un artículo
   */
  updateStock: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        delta: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return await mockQueries.updateInventoryStock(input.id, input.delta);
        return await updateInventoryStock(input.id, input.delta);
      } catch (error) {
        console.error("[inventory.updateStock] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update stock",
        });
      }
    }),
});
