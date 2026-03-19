/**
 * ============================================================================
 * PROFIT DESIGN GENERATOR - INVENTORY AWARE
 * ============================================================================
 * Extiende el generador de diseño para usar plantas del inventario real
 * SIN MOVER CÓDIGO EXISTENTE - Solo agrega nuevas funciones
 */

import type {
  PlantDefinition,
  PlantPlacement,
  GeneratedDesign,
  DesignGenerationConfig,
  PlantScore,
} from "./profit-types";
import { DesignType } from "./profit-types";
import { scorePlant, SCORING_WEIGHTS } from "./profit-scoring";
import type { TerrainZone } from "./terrain-types";

/**
 * Validar que todas las plantas en un diseño provengan del inventario
 * REGLA CRÍTICA: Prohibido usar plantas fuera del inventario
 */
export function validateDesignUsesOnlyInventoryPlants(
  design: GeneratedDesign,
  inventoryPlants: PlantDefinition[]
): {
  isValid: boolean;
  errors: string[];
} {
  const inventoryIds = new Set(inventoryPlants.map((p) => p.id));
  const errors: string[] = [];

  for (const placement of design.placements) {
    if (!inventoryIds.has(placement.plantId)) {
      errors.push(`Plant ${placement.plantId} is not in inventory`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generar diseño balanceado usando SOLO plantas del inventario
 */
export function generateBalancedDesignFromInventory(
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig = {}
): GeneratedDesign {
  // Filtrar plantas con stock disponible
  const availablePlants = inventoryPlants.filter((p) => p.inventory.available > 0);

  if (availablePlants.length === 0) {
    return createEmptyDesign("balanced");
  }

  const scores = availablePlants.map((p) => scorePlant(p, SCORING_WEIGHTS));

  // Seleccionar plantas de score medio-alto
  const selectedScores = scores
    .filter((s) => s.totalScore >= 55)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, config.maxPlants || 15);

  // Si no hay plantas con score >= 55, usar las mejores disponibles
  if (selectedScores.length === 0) {
    selectedScores.push(...scores.slice(0, Math.min(5, scores.length)));
  }

  const placements = createPlacementsFromInventory(selectedScores, availablePlants, zones, config);

  return createDesignFromInventory("balanced" as any, placements, availablePlants);
}

/**
 * Generar diseño premium usando SOLO plantas del inventario
 */
export function generatePremiumDesignFromInventory(
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig = {}
): GeneratedDesign {
  // Filtrar plantas con stock disponible
  const availablePlants = inventoryPlants.filter((p) => p.inventory.available > 0);

  if (availablePlants.length === 0) {
    return createEmptyDesign("premium");
  }

  const weights = {
    margin: 0.1,
    visual: 0.6,
    maintenance: 0.1,
    compatibility: 0.2,
  };

  const scores = availablePlants.map((p) => scorePlant(p, weights));

  // Seleccionar plantas de alto score visual
  const selectedScores = scores
    .filter((s) => s.visualScore >= 70)
    .sort((a, b) => b.visualScore - a.visualScore)
    .slice(0, config.maxPlants || 12);

  // Si no hay plantas con score visual >= 70, usar las mejores disponibles
  if (selectedScores.length === 0) {
    selectedScores.push(...scores.slice(0, Math.min(5, scores.length)));
  }

  const placements = createPlacementsFromInventory(selectedScores, availablePlants, zones, config);

  return createDesignFromInventory("premium" as any, placements, availablePlants);
}

/**
 * Generar diseño de alta ganancia usando SOLO plantas del inventario
 */
export function generateHighProfitDesignFromInventory(
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig = {}
): GeneratedDesign {
  // Filtrar plantas con stock disponible
  const availablePlants = inventoryPlants.filter((p) => p.inventory.available > 0);

  if (availablePlants.length === 0) {
    return createEmptyDesign("high_profit");
  }

  const weights = {
    margin: 0.7,
    visual: 0.1,
    maintenance: 0.1,
    compatibility: 0.1,
  };

  const scores = availablePlants.map((p) => scorePlant(p, weights));

  // Seleccionar plantas de alto margen
  const selectedScores = scores
    .filter((s) => s.marginScore >= 20)
    .sort((a, b) => b.marginScore - a.marginScore)
    .slice(0, config.maxPlants || 20);

  // Si no hay plantas con margen >= 20, usar todas
  if (selectedScores.length === 0) {
    selectedScores.push(...scores.slice(0, Math.min(5, scores.length)));
  }

  const placements = createPlacementsFromInventory(selectedScores, availablePlants, zones, config);

  return createDesignFromInventory("high_profit" as any, placements, availablePlants);
}

/**
 * Crear colocaciones de plantas respetando stock del inventario
 */
function createPlacementsFromInventory(
  scores: PlantScore[],
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig
): PlantPlacement[] {
  const placements: PlantPlacement[] = [];
  const plantMap = new Map(inventoryPlants.map((p) => [p.id, p]));
  let placementId = 0;

  // Si no hay zonas, usar zona por defecto
  const validZones = zones.length > 0 ? zones : [{
    id: "default_zone",
    type: "soil" as any,
    area: 100,
    centroid: { x: 50, y: 50 },
    polygon: [],
  }];

  for (const score of scores) {
    const plant = plantMap.get(score.plantId);
    if (!plant) continue;

    // Respetar stock disponible
    const maxQuantityByStock = plant.inventory.available;
    if (maxQuantityByStock <= 0) continue;

    // Encontrar zona válida
    let zone = validZones.find((z) => plant.allowedZones.includes(z.type as any));
    if (!zone) {
      zone = validZones[0]!;
    }

    // Calcular cantidad de plantas
    const maxPlantsInZone = Math.max(1, Math.floor(zone.area / (plant.spacing * plant.spacing)));
    const quantity = Math.min(
      maxPlantsInZone,
      maxQuantityByStock, // CRÍTICO: Respetar stock disponible
      config.maxRepetition || 5,
      Math.max(1, Math.ceil(Math.random() * 3))
    );

    for (let i = 0; i < quantity; i++) {
      const placement: PlantPlacement = {
        id: `placement_${placementId++}`,
        plantId: plant.id,
        position: {
          x: zone.centroid.x + (Math.random() - 0.5) * Math.sqrt(zone.area),
          y: zone.centroid.y + (Math.random() - 0.5) * Math.sqrt(zone.area),
        },
        radius: plant.spacing / 2,
        zoneId: zone.id,
        quantity: 1,
        score,
      };

      placements.push(placement);
    }
  }

  return placements;
}

/**
 * Crear objeto GeneratedDesign usando precios reales del inventario
 */
function createDesignFromInventory(
  type: string,
  placements: PlantPlacement[],
  inventoryPlants: PlantDefinition[]
): GeneratedDesign {
  const plantMap = new Map(inventoryPlants.map((p) => [p.id, p]));
  let totalCost = 0;
  let totalRevenue = 0;
  const plantIds = new Set<string>();

  for (const placement of placements) {
    const plant = plantMap.get(placement.plantId);
    if (!plant) continue;

    // CRÍTICO: Usar precios reales del inventario
    totalCost += placement.quantity * plant.cost.purchasePrice;
    totalRevenue += placement.quantity * plant.cost.sellingPrice;
    plantIds.add(placement.plantId);
  }

  const totalMargin = totalRevenue - totalCost;
  const profitMarginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const averageScore =
    placements.length > 0
      ? placements.reduce((sum, p) => sum + p.score.totalScore, 0) / placements.length
      : 0;
  const visualScore =
    placements.length > 0
      ? placements.reduce((sum, p) => sum + p.score.visualScore, 0) / placements.length
      : 0;
  const maintenanceScore =
    placements.length > 0
      ? placements.reduce((sum, p) => sum + p.score.maintenanceScore, 0) / placements.length
      : 0;

  return {
    id: `design_${Date.now()}_${Math.random()}`,
    type: type as any,
    placements,
    totalCost,
    totalRevenue,
    totalMargin,
    profitMarginPercentage,
    averageScore,
    visualScore,
    maintenanceScore,
    plantCount: placements.length,
    uniquePlants: plantIds.size,
    timestamp: Date.now(),
  };
}

/**
 * Crear diseño vacío
 */
function createEmptyDesign(type: string): GeneratedDesign {
  return {
    id: `design_${Date.now()}_${Math.random()}`,
    type: type as any,
    placements: [],
    totalCost: 0,
    totalRevenue: 0,
    totalMargin: 0,
    profitMarginPercentage: 0,
    averageScore: 0,
    visualScore: 0,
    maintenanceScore: 0,
    plantCount: 0,
    uniquePlants: 0,
    timestamp: Date.now(),
  };
}

/**
 * Generar todos los tipos de diseño usando inventario
 */
export function generateAllDesignsFromInventory(
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig = {}
): {
  balanced: GeneratedDesign;
  premium: GeneratedDesign;
  highProfit: GeneratedDesign;
} {
  return {
    balanced: generateBalancedDesignFromInventory(inventoryPlants, zones, config),
    premium: generatePremiumDesignFromInventory(inventoryPlants, zones, config),
    highProfit: generateHighProfitDesignFromInventory(inventoryPlants, zones, config),
  };
}

/**
 * Filtrar plantas del inventario por criterios
 */
export function filterInventoryPlants(
  inventoryPlants: PlantDefinition[],
  filters: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    climate?: string;
    minStock?: number;
  }
): PlantDefinition[] {
  return inventoryPlants.filter((plant) => {
    if (filters.type && plant.type !== filters.type) return false;
    if (filters.minPrice && plant.cost.sellingPrice < filters.minPrice) return false;
    if (filters.maxPrice && plant.cost.sellingPrice > filters.maxPrice) return false;
    if (filters.minStock && plant.inventory.available < filters.minStock) return false;

    const metadata = plant.metadata || {};
    if (filters.climate && metadata.climate && metadata.climate !== filters.climate) return false;

    return true;
  });
}

/**
 * Obtener plantas del inventario para modo rápido (VENTA)
 * Usuario selecciona 2-5 especies, sistema diseña SOLO con esas
 */
export function generateQuickSaleDesign(
  selectedPlantIds: string[],
  inventoryPlants: PlantDefinition[],
  zones: TerrainZone[],
  config: DesignGenerationConfig = {}
): GeneratedDesign {
  if (selectedPlantIds.length === 0 || selectedPlantIds.length > 5) {
    return createEmptyDesign("balanced");
  }

  // Filtrar solo las plantas seleccionadas
  const selectedPlants = inventoryPlants.filter((p) =>
    selectedPlantIds.includes(p.id) && p.inventory.available > 0
  );

  if (selectedPlants.length === 0) {
    return createEmptyDesign("balanced");
  }

  const scores = selectedPlants.map((p) => scorePlant(p, SCORING_WEIGHTS));
  const placements = createPlacementsFromInventory(scores, selectedPlants, zones, config);

  return createDesignFromInventory("balanced" as any, placements, selectedPlants);
}
