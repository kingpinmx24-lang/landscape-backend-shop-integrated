/**
 * ============================================================================
 * SHOP ROUTER - TIENDA / INVENTARIO
 * ============================================================================
 * Expone el inventario y funciones de integración con el diseño
 * Accesible desde el editor en vivo
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllPlantsFromInventory,
  getPlantFromInventory,
  validateInventoryForDesign,
  reservePlantsForProject,
  returnPlantsToInventory,
  getInventoryAnalysis,
} from "../inventory-integration";
import {
  generateAllDesignsFromInventory,
  filterInventoryPlants,
  generateQuickSaleDesign,
  validateDesignUsesOnlyInventoryPlants,
} from "../../shared/profit-design-generator-inventory";
import { listInventory } from "../queries";

export const shopRouter = router({
  /**
   * LIST SHOP INVENTORY
   * GET /api/trpc/shop.listInventory
   * Obtiene todas las plantas disponibles en la tienda
   */
  listInventory: protectedProcedure.query(async () => {
    try {
      const items = await listInventory();

      return items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        imageUrl: item.imageUrl,
        purchasePrice: parseFloat(item.purchasePrice),
        sellingPrice: parseFloat(item.sellingPrice),
        stock: item.stock,
        spacing: parseFloat(item.spacing),
        metadata: typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata,
      }));
    } catch (error) {
      console.error("[shop.listInventory] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list inventory",
      });
    }
  }),

  /**
   * GET SHOP ITEM
   * GET /api/trpc/shop.getItem?id=123
   * Obtiene detalles de una planta específica
   */
  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const plant = await getPlantFromInventory(input.id);

        if (!plant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plant not found in inventory",
          });
        }

        return plant;
      } catch (error) {
        console.error("[shop.getItem] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get plant",
        });
      }
    }),

  /**
   * FILTER INVENTORY
   * POST /api/trpc/shop.filterInventory
   * Filtra plantas por criterios (tipo, precio, clima)
   */
  filterInventory: protectedProcedure
    .input(
      z.object({
        type: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        climate: z.string().optional(),
        minStock: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const allPlants = await getAllPlantsFromInventory();
        const filtered = filterInventoryPlants(allPlants, input);

        return filtered.map((plant) => ({
          id: plant.id,
          name: plant.name,
          type: plant.type,
          cost: plant.cost,
          inventory: plant.inventory,
          visual: plant.visual,
          metadata: plant.metadata,
        }));
      } catch (error) {
        console.error("[shop.filterInventory] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to filter inventory",
        });
      }
    }),

  /**
   * VALIDATE DESIGN
   * POST /api/trpc/shop.validateDesign
   * Valida si un diseño usa SOLO plantas del inventario
   * REGLA CRÍTICA: Prohibido usar plantas fuera del inventario
   */
  validateDesign: protectedProcedure
    .input(
      z.object({
        placements: z.array(
          z.object({
            plantId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validar disponibilidad
        const validation = await validateInventoryForDesign(input.placements);

        return {
          isValid: validation.isValid,
          shortages: validation.shortages,
          message: validation.isValid
            ? "All plants are available in inventory"
            : `Inventory shortages detected for ${validation.shortages.length} plant(s)`,
        };
      } catch (error) {
        console.error("[shop.validateDesign] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate design",
        });
      }
    }),

  /**
   * RESERVE PLANTS
   * POST /api/trpc/shop.reservePlants
   * Reserva plantas del inventario para un proyecto
   */
  reservePlants: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        placements: z.array(
          z.object({
            plantId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await reservePlantsForProject(input.placements);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Failed to reserve plants: ${result.failed.map((f) => f.reason).join("; ")}`,
          });
        }

        return {
          success: true,
          reserved: result.reserved,
          message: `Successfully reserved ${result.reserved.length} plant type(s)`,
        };
      } catch (error) {
        console.error("[shop.reservePlants] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reserve plants",
        });
      }
    }),

  /**
   * RETURN PLANTS
   * POST /api/trpc/shop.returnPlants
   * Devuelve plantas al inventario
   */
  returnPlants: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        placements: z.array(
          z.object({
            plantId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await returnPlantsToInventory(input.placements);

        return {
          success: true,
          returned: result.returned,
          message: `Successfully returned ${result.returned.length} plant type(s)`,
        };
      } catch (error) {
        console.error("[shop.returnPlants] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to return plants",
        });
      }
    }),

  /**
   * GET INVENTORY ANALYSIS
   * GET /api/trpc/shop.getAnalysis
   * Obtiene análisis de disponibilidad del inventario
   */
  getAnalysis: protectedProcedure.query(async () => {
    try {
      const analysis = await getInventoryAnalysis();

      return {
        totalItems: analysis.totalItems,
        totalStock: analysis.totalStock,
        averageStockLevel: analysis.averageStockLevel,
        lowStockItems: analysis.lowStockItems,
        outOfStockItems: analysis.outOfStockItems,
      };
    } catch (error) {
      console.error("[shop.getAnalysis] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get inventory analysis",
      });
    }
  }),

  /**
   * GENERATE DESIGNS FROM INVENTORY
   * POST /api/trpc/shop.generateDesigns
   * Genera diseños usando SOLO plantas del inventario
   */
  generateDesigns: protectedProcedure
    .input(
      z.object({
        zones: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["soil", "grass", "concrete"]),
            area: z.number().positive(),
            centroid: z.object({ x: z.number(), y: z.number() }),
            polygon: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
          })
        ),
        maxPlants: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const inventoryPlants = await getAllPlantsFromInventory();

        if (inventoryPlants.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No plants available in inventory",
          });
        }

        const designs = generateAllDesignsFromInventory(inventoryPlants, input.zones, {
          maxPlants: input.maxPlants,
        });

        return {
          balanced: {
            type: designs.balanced.type,
            totalCost: designs.balanced.totalCost,
            totalRevenue: designs.balanced.totalRevenue,
            totalMargin: designs.balanced.totalMargin,
            profitMarginPercentage: designs.balanced.profitMarginPercentage,
            plantCount: designs.balanced.plantCount,
            uniquePlants: designs.balanced.uniquePlants,
          },
          premium: {
            type: designs.premium.type,
            totalCost: designs.premium.totalCost,
            totalRevenue: designs.premium.totalRevenue,
            totalMargin: designs.premium.totalMargin,
            profitMarginPercentage: designs.premium.profitMarginPercentage,
            plantCount: designs.premium.plantCount,
            uniquePlants: designs.premium.uniquePlants,
          },
          highProfit: {
            type: designs.highProfit.type,
            totalCost: designs.highProfit.totalCost,
            totalRevenue: designs.highProfit.totalRevenue,
            totalMargin: designs.highProfit.totalMargin,
            profitMarginPercentage: designs.highProfit.profitMarginPercentage,
            plantCount: designs.highProfit.plantCount,
            uniquePlants: designs.highProfit.uniquePlants,
          },
        };
      } catch (error) {
        console.error("[shop.generateDesigns] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate designs",
        });
      }
    }),

  /**
   * QUICK SALE DESIGN
   * POST /api/trpc/shop.quickSaleDesign
   * Modo rápido: Usuario selecciona 2-5 especies, sistema diseña SOLO con esas
   */
  quickSaleDesign: protectedProcedure
    .input(
      z.object({
        plantIds: z.array(z.string()).min(2).max(5),
        zones: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["soil", "grass", "concrete"]),
            area: z.number().positive(),
            centroid: z.object({ x: z.number(), y: z.number() }),
            polygon: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const inventoryPlants = await getAllPlantsFromInventory();
        const design = generateQuickSaleDesign(input.plantIds, inventoryPlants, input.zones);

        return {
          type: design.type,
          totalCost: design.totalCost,
          totalRevenue: design.totalRevenue,
          totalMargin: design.totalMargin,
          profitMarginPercentage: design.profitMarginPercentage,
          plantCount: design.plantCount,
          uniquePlants: design.uniquePlants,
          placements: design.placements.map((p) => ({
            plantId: p.plantId,
            position: p.position,
            quantity: p.quantity,
          })),
        };
      } catch (error) {
        console.error("[shop.quickSaleDesign] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate quick sale design",
        });
      }
    }),
});
