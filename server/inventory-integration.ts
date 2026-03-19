/**
 * ============================================================================
 * INVENTORY INTEGRATION LAYER
 * ============================================================================
 * Conecta el módulo de inventario con el motor de diseño de ganancia
 * SIN MOVER CÓDIGO EXISTENTE - Solo agrega nuevas funciones
 */

import type { PlantDefinition, InventoryInfo } from "../shared/profit-types";
import { listInventory, getInventoryItemById, updateInventoryStock } from "./queries";
import type { InventoryItem } from "../drizzle/schema";

/**
 * Convertir item de inventario a PlantDefinition
 * Mapea los datos de la base de datos al formato esperado por el motor de ganancia
 */
export async function convertInventoryItemToPlantDefinition(
  item: InventoryItem
): Promise<PlantDefinition | null> {
  try {
    // Parsear metadatos si existen
    const metadata = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata || {};

    const plantDef: PlantDefinition = {
      id: String(item.id),
      name: item.name,
      type: (item.type as any) || "flowering",
      allowedZones: metadata.allowedZones || ["soil", "grass"],
      cost: {
        purchasePrice: parseFloat(item.purchasePrice),
        sellingPrice: parseFloat(item.sellingPrice),
        margin: parseFloat(item.sellingPrice) - parseFloat(item.purchasePrice),
        marginPercentage: (
          ((parseFloat(item.sellingPrice) - parseFloat(item.purchasePrice)) / parseFloat(item.sellingPrice)) * 100
        ),
      },
      maintenance: metadata.maintenance || {
        frequency: "low",
        costPerYear: 0,
        difficulty: "easy",
        waterNeeds: "medium",
        sunlight: "full_sun",
      },
      visual: metadata.visual || {
        color: "#228B22",
        height: 1.5,
        width: 1.5,
        season: "year_round",
        visualScore: 70,
        aestheticCategory: "foliage",
      },
      compatibility: metadata.compatibility || {
        compatibleWith: [],
        incompatibleWith: [],
        compatibilityScore: 75,
        groupingPreference: "groups",
      },
      inventory: {
        available: item.stock,
        reserved: 0,
        reorderLevel: metadata.reorderLevel || 5,
        reorderQuantity: metadata.reorderQuantity || 10,
        lastRestockDate: item.updatedAt?.getTime() || Date.now(),
      },
      spacing: parseFloat(item.spacing),
      minArea: metadata.minArea,
      maxArea: metadata.maxArea,
      metadata: {
        imageUrl: item.imageUrl,
        ...metadata,
      },
    };

    return plantDef;
  } catch (error) {
    console.error(`[convertInventoryItemToPlantDefinition] Error for item ${item.id}:`, error);
    return null;
  }
}

/**
 * Obtener todas las plantas del inventario como PlantDefinitions
 * Para usar en el generador de diseño
 */
export async function getAllPlantsFromInventory(): Promise<PlantDefinition[]> {
  try {
    const items = await listInventory();
    const plants: PlantDefinition[] = [];

    for (const item of items) {
      const plant = await convertInventoryItemToPlantDefinition(item);
      if (plant) {
        plants.push(plant);
      }
    }

    return plants;
  } catch (error) {
    console.error("[getAllPlantsFromInventory] Error:", error);
    return [];
  }
}

/**
 * Obtener una planta específica del inventario
 */
export async function getPlantFromInventory(plantId: string): Promise<PlantDefinition | null> {
  try {
    const id = parseInt(plantId, 10);
    if (isNaN(id)) return null;

    const item = await getInventoryItemById(id);
    if (!item) return null;

    return convertInventoryItemToPlantDefinition(item);
  } catch (error) {
    console.error("[getPlantFromInventory] Error:", error);
    return null;
  }
}

/**
 * Validar disponibilidad de plantas en inventario
 * Verifica si hay suficiente stock para un diseño propuesto
 */
export async function validateInventoryForDesign(
  placements: Array<{ plantId: string; quantity: number }>
): Promise<{
  isValid: boolean;
  shortages: Array<{
    plantId: string;
    plantName: string;
    required: number;
    available: number;
  }>;
}> {
  const shortages: Array<{
    plantId: string;
    plantName: string;
    required: number;
    available: number;
  }> = [];

  for (const placement of placements) {
    const plant = await getPlantFromInventory(placement.plantId);
    if (!plant) {
      shortages.push({
        plantId: placement.plantId,
        plantName: "Unknown",
        required: placement.quantity,
        available: 0,
      });
      continue;
    }

    if (plant.inventory.available < placement.quantity) {
      shortages.push({
        plantId: placement.plantId,
        plantName: plant.name,
        required: placement.quantity,
        available: plant.inventory.available,
      });
    }
  }

  return {
    isValid: shortages.length === 0,
    shortages,
  };
}

/**
 * Reservar plantas del inventario para un proyecto
 * Reduce el stock disponible
 */
export async function reservePlantsForProject(
  placements: Array<{ plantId: string; quantity: number }>
): Promise<{
  success: boolean;
  reserved: Array<{ plantId: string; quantity: number }>;
  failed: Array<{ plantId: string; reason: string }>;
}> {
  const reserved: Array<{ plantId: string; quantity: number }> = [];
  const failed: Array<{ plantId: string; reason: string }> = [];

  for (const placement of placements) {
    try {
      const id = parseInt(placement.plantId, 10);
      if (isNaN(id)) {
        failed.push({ plantId: placement.plantId, reason: "Invalid plant ID" });
        continue;
      }

      const plant = await getInventoryItemById(id);
      if (!plant) {
        failed.push({ plantId: placement.plantId, reason: "Plant not found" });
        continue;
      }

      if (plant.stock < placement.quantity) {
        failed.push({
          plantId: placement.plantId,
          reason: `Insufficient stock (available: ${plant.stock}, required: ${placement.quantity})`,
        });
        continue;
      }

      // Actualizar stock
      await updateInventoryStock(id, -placement.quantity);
      reserved.push({ plantId: placement.plantId, quantity: placement.quantity });
    } catch (error) {
      failed.push({
        plantId: placement.plantId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: failed.length === 0,
    reserved,
    failed,
  };
}

/**
 * Devolver plantas al inventario
 * Aumenta el stock disponible
 */
export async function returnPlantsToInventory(
  placements: Array<{ plantId: string; quantity: number }>
): Promise<{
  success: boolean;
  returned: Array<{ plantId: string; quantity: number }>;
  failed: Array<{ plantId: string; reason: string }>;
}> {
  const returned: Array<{ plantId: string; quantity: number }> = [];
  const failed: Array<{ plantId: string; reason: string }> = [];

  for (const placement of placements) {
    try {
      const id = parseInt(placement.plantId, 10);
      if (isNaN(id)) {
        failed.push({ plantId: placement.plantId, reason: "Invalid plant ID" });
        continue;
      }

      // Actualizar stock (sumar)
      await updateInventoryStock(id, placement.quantity);
      returned.push({ plantId: placement.plantId, quantity: placement.quantity });
    } catch (error) {
      failed.push({
        plantId: placement.plantId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: failed.length === 0,
    returned,
    failed,
  };
}

/**
 * Obtener análisis de inventario
 * Retorna estadísticas de disponibilidad
 */
export async function getInventoryAnalysis(): Promise<{
  totalItems: number;
  totalStock: number;
  lowStockItems: Array<{ id: number; name: string; stock: number; reorderLevel: number }>;
  outOfStockItems: Array<{ id: number; name: string }>;
  averageStockLevel: number;
}> {
  try {
    const items = await listInventory();

    const lowStockItems: Array<{ id: number; name: string; stock: number; reorderLevel: number }> = [];
    const outOfStockItems: Array<{ id: number; name: string }> = [];
    let totalStock = 0;

    for (const item of items) {
      totalStock += item.stock;

      const metadata = typeof item.metadata === "string" ? JSON.parse(item.metadata) : item.metadata || {};
      const reorderLevel = metadata.reorderLevel || 5;

      if (item.stock === 0) {
        outOfStockItems.push({ id: item.id, name: item.name });
      } else if (item.stock < reorderLevel) {
        lowStockItems.push({
          id: item.id,
          name: item.name,
          stock: item.stock,
          reorderLevel,
        });
      }
    }

    return {
      totalItems: items.length,
      totalStock,
      lowStockItems,
      outOfStockItems,
      averageStockLevel: items.length > 0 ? totalStock / items.length : 0,
    };
  } catch (error) {
    console.error("[getInventoryAnalysis] Error:", error);
    return {
      totalItems: 0,
      totalStock: 0,
      lowStockItems: [],
      outOfStockItems: [],
      averageStockLevel: 0,
    };
  }
}
