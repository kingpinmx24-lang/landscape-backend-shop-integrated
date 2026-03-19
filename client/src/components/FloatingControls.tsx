/**
 * Component: FloatingControls
 * ============================================================================
 * Controles flotantes para edición rápida de objetos seleccionados
 * Integrado con información de precio y stock del inventario.
 */

import React, { useCallback, useState } from "react";
import { SelectedObject } from "../../../shared/live-interaction-types";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ShoppingCart, Info } from "lucide-react";

interface FloatingControlsProps {
  x: number;
  y: number;
  selectedObject: SelectedObject | null;
  onDelete?: (objectId: string) => void;
  onDuplicate?: (object: SelectedObject) => void;
  onChangeType?: (objectId: string, newType: string) => void;
  availableTypes?: string[];
  isVisible: boolean;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  x,
  y,
  selectedObject,
  onDelete,
  onDuplicate,
  isVisible,
}) => {
  const handleDelete = useCallback(() => {
    if (selectedObject && onDelete) {
      onDelete(selectedObject.id);
    }
  }, [selectedObject, onDelete]);

  const handleDuplicate = useCallback(() => {
    if (selectedObject && onDuplicate) {
      onDuplicate(selectedObject);
    }
  }, [selectedObject, onDuplicate]);

  if (!isVisible || !selectedObject) {
    return null;
  }

  const plantData = (selectedObject as any).metadata || {};
  const price = (selectedObject as any).price || 0;

  return (
    <div
      className="absolute z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-blue-100 p-3 w-56 animate-in zoom-in-95 duration-200"
      style={{
        left: `${x + 20}px`,
        top: `${y - 60}px`,
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 border-b pb-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden border border-blue-100">
            <img src={(selectedObject as any).imageUrl} className="max-w-full max-h-full object-contain" alt="" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold truncate text-gray-800">{selectedPlantName(selectedObject)}</h4>
            <p className="text-[10px] font-black text-blue-600">${price.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 text-[10px] border-blue-200 hover:bg-blue-50 text-blue-700"
          >
            <Copy className="w-3 h-3 mr-1" />
            Duplicar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="h-8 text-[10px]"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Eliminar
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 space-y-1">
          <div className="flex justify-between text-[9px]">
            <span className="text-gray-400">Stock Disponible:</span>
            <span className="font-bold text-gray-600">{plantData.stock || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-gray-400">Espaciado:</span>
            <span className="font-bold text-gray-600">{plantData.spacing || '1.0'}m</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-[8px] text-blue-400 justify-center">
          <Info className="w-2 h-2" />
          <span>Arrastra el objeto para moverlo</span>
        </div>
      </div>
    </div>
  );
};

function selectedPlantName(obj: any) {
  if (obj.metadata && obj.metadata.name) return obj.metadata.name;
  return obj.type.charAt(0).toUpperCase() + obj.type.slice(1);
}
