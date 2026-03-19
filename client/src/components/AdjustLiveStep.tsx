/**
 * Component: AdjustLiveStep
 * ============================================================================
 * Paso 4 del flujo: Ajuste en vivo con interacción completa
 * Integrado con el Inventario/Tienda Real para cotización exacta.
 */

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { LiveInteractionCanvas } from "./LiveInteractionCanvas";
import { FloatingControls } from "./FloatingControls";
import { MaterialEditor } from "./MaterialEditor";
import { DirectedInputPanel } from "./DirectedInputPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Save, Eye, Undo2, Redo2, ShoppingCart, TrendingUp } from "lucide-react";
import { useLiveInteraction } from "@/hooks/useLiveInteraction";
import { useDesignSync } from "@/hooks/useDesignSync";
import { DesignData, AdjustLiveData } from "@shared/workflow-persistence-types";

interface AdjustLiveStepProps {
  projectId: string;
  initialDesign: DesignData;
  onComplete?: (adjustmentData: AdjustLiveData) => void;
  onCancel?: () => void;
}

export const AdjustLiveStep: React.FC<AdjustLiveStepProps> = ({
  projectId,
  initialDesign,
  onComplete,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<"canvas" | "materials" | "input">("canvas");
  const [userNotes, setUserNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks de interacción
  const liveInteraction = useLiveInteraction();
  const designSync = useDesignSync(projectId, {
    autoSaveInterval: 2000,
    debounceDelay: 500,
    enableOfflineMode: true,
  });

  // Inicializar con diseño inicial
  useEffect(() => {
    if (initialDesign && initialDesign.plants) {
      designSync.updateDesignState({
        objects: initialDesign.plants.map((p) => ({
          id: p.id,
          type: p.type,
          x: p.x,
          y: p.y,
          metadata: p.metadata || {},
          price: p.cost || 0,
          imageUrl: p.imageUrl || "",
        })),
        materials: initialDesign.materials.reduce(
          (acc, m) => {
            acc[m.id] = m.type;
            return acc;
          },
          {} as Record<string, string>
        ),
      });
    }
  }, [initialDesign]);

  // Calcular cotización en tiempo real
  const quotation = useMemo(() => {
    const plants = designSync.designState.objects;
    const plantsCost = plants.reduce((sum, p) => sum + (p.price || 0), 0);
    const materialsCost = 0; // Simplificado
    const laborCost = plants.length * 15; // $15 por planta plantada
    const totalCost = plantsCost + materialsCost + laborCost;
    const margin = 0.35;
    const finalPrice = totalCost * (1 + margin);

    return {
      plantsCount: plants.length,
      plantsCost,
      materialsCost,
      laborCost,
      totalCost,
      margin,
      finalPrice,
    };
  }, [designSync.designState.objects]);

  const handleSelectObject = useCallback((object: any) => {
    liveInteraction.selectObject(object);
  }, [liveInteraction]);

  const handleMoveObject = useCallback((moveData: any) => {
    liveInteraction.moveObject(moveData);
    designSync.updateObject(moveData.objectId, {
      x: moveData.newX,
      y: moveData.newY,
    });
  }, [liveInteraction, designSync]);

  const handleDeleteObject = useCallback((deleteData: any) => {
    const objectId = typeof deleteData === 'string' ? deleteData : deleteData.id;
    liveInteraction.deleteObject({ id: objectId } as any);
    designSync.deleteObject(objectId);
  }, [liveInteraction, designSync]);

  const handleDirectedInput = useCallback((plantType: string, quantity: number, location: string, plantData?: any) => {
    for (let i = 0; i < quantity; i++) {
      const newPlant = {
        id: `plant-${Date.now()}-${i}`,
        type: plantType,
        x: 150 + i * 70,
        y: 150 + (i % 2) * 30,
        price: plantData ? parseFloat(plantData.sellingPrice) : 25,
        imageUrl: plantData ? plantData.imageUrl : "",
        metadata: plantData || {},
      };
      designSync.addObject(newPlant);
    }
    setActiveTab("canvas");
  }, [designSync]);

  const handleComplete = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const adjustmentData: AdjustLiveData = {
        changes: [],
        finalDesign: {
          ...initialDesign,
          plants: designSync.designState.objects.map((obj) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            radius: 20,
            name: obj.type,
            cost: obj.price || 25,
            imageUrl: obj.imageUrl,
            metadata: obj.metadata,
          })),
          quotation: {
            plantsCost: quotation.plantsCost,
            materialsCost: quotation.materialsCost,
            laborCost: quotation.laborCost,
            totalCost: quotation.totalCost,
            margin: quotation.margin,
            finalPrice: quotation.finalPrice,
          },
          timestamp: Date.now(),
        },
        userNotes,
        timestamp: Date.now(),
      };
      await designSync.manualSync();
      onComplete?.(adjustmentData);
    } catch (error) {
      console.error("Error al completar ajuste:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [designSync, initialDesign, userNotes, onComplete, quotation]);

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gray-50">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Editor de Paisajismo Pro</h2>
          <p className="text-gray-500 text-xs">Diseño basado en inventario real</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Presupuesto Estimado</p>
            <p className="text-2xl font-black text-blue-600">${quotation.finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <Button 
            onClick={handleComplete} 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white px-8"
          >
            {isSubmitting ? "Guardando..." : "Finalizar Diseño"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-white border">
              <TabsTrigger value="canvas">Vista de Diseño</TabsTrigger>
              <TabsTrigger value="input">Tienda / Inventario</TabsTrigger>
              <TabsTrigger value="materials">Materiales</TabsTrigger>
            </TabsList>

            <TabsContent value="canvas" className="flex-1 mt-0 relative bg-white rounded-xl border shadow-inner overflow-hidden">
              <LiveInteractionCanvas
                width={1000}
                height={700}
                objects={designSync.designState.objects.map(obj => ({
                  ...obj,
                  radius: 25,
                }))}
                onSelectionChange={(selected) => {
                  if (selected.length > 0) handleSelectObject(selected[0]);
                }}
              />
              <FloatingControls
                x={liveInteraction.state.floatingControlsX || 0}
                y={liveInteraction.state.floatingControlsY || 0}
                selectedObject={liveInteraction.state.selectedObjects[0] || null}
                onDelete={handleDeleteObject}
                isVisible={liveInteraction.state.showFloatingControls}
              />
            </TabsContent>

            <TabsContent value="input" className="mt-0">
              <DirectedInputPanel 
                onAddPlants={handleDirectedInput}
                isLoading={isSubmitting}
              />
            </TabsContent>
            
            <TabsContent value="materials" className="mt-0">
              <MaterialEditor onApplyMaterial={() => {}} onCleanArea={() => {}} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-80 flex flex-col gap-4">
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Resumen de Compra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plantas ({quotation.plantsCount})</span>
                <span className="font-medium">${quotation.plantsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mano de Obra</span>
                <span className="font-medium">${quotation.laborCost.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t flex justify-between font-bold text-blue-600">
                <span>Total Cliente</span>
                <span>${quotation.finalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Rentabilidad (35%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +${(quotation.finalPrice - quotation.totalCost).toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Ganancia neta estimada tras costos de materiales y labor.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
