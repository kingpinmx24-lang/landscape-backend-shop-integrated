/**
 * Component: LiveInteractionCanvas
 * ============================================================================
 * Canvas para interacción en vivo con selección y movimiento de objetos
 * Soporta renderizado de imágenes PNG para plantas del inventario.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useLiveInteraction } from "@/hooks/useLiveInteraction";
import { SelectedObject, MoveData } from "../../../shared/live-interaction-types";

interface LiveInteractionCanvasProps {
  width: number;
  height: number;
  objects: SelectedObject[];
  onObjectsChange?: (objects: SelectedObject[]) => void;
  onSelectionChange?: (selected: SelectedObject[]) => void;
  gridSize?: number;
  snapToGrid?: boolean;
  respectCollisions?: boolean;
  onError?: (error: string) => void;
}

export const LiveInteractionCanvas: React.FC<LiveInteractionCanvasProps> = ({
  width,
  height,
  objects,
  onObjectsChange,
  onSelectionChange,
  gridSize = 20,
  snapToGrid = true,
  respectCollisions = true,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  
  const {
    state,
    selectObject,
    deselectAll,
    startDrag,
    updateDrag,
    endDrag,
    moveObject,
    showFloatingControls,
    hideFloatingControls,
  } = useLiveInteraction({
    gridSize,
    snapToGrid,
    respectCollisions,
  });

  const [currentObjects, setCurrentObjects] = useState<SelectedObject[]>(objects);
  const draggedObjectRef = useRef<SelectedObject | null>(null);

  useEffect(() => {
    setCurrentObjects(objects);
  }, [objects]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(state.selectedObjects);
    }
  }, [state.selectedObjects, onSelectionChange]);

  useEffect(() => {
    if (onObjectsChange) {
      onObjectsChange(currentObjects);
    }
  }, [currentObjects, onObjectsChange]);

  const getObjectAtPosition = useCallback(
    (x: number, y: number): SelectedObject | null => {
      for (let i = currentObjects.length - 1; i >= 0; i--) {
        const obj = currentObjects[i];
        const distance = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2);
        if (distance <= obj.radius) {
          return obj;
        }
      }
      return null;
    },
    [currentObjects]
  );

  const snapToGridValue = useCallback(
    (value: number): number => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedObject = getObjectAtPosition(x, y);

      if (clickedObject) {
        selectObject(clickedObject);
        showFloatingControls(x, y);
      } else {
        deselectAll();
        hideFloatingControls();
      }
    },
    [getObjectAtPosition, selectObject, deselectAll, showFloatingControls, hideFloatingControls]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clickedObject = getObjectAtPosition(x, y);

      if (clickedObject && state.selectedObjects.some((obj) => obj.id === clickedObject.id)) {
        draggedObjectRef.current = clickedObject;
        startDrag(x, y);
      }
    },
    [getObjectAtPosition, state.selectedObjects, startDrag]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!state.isDragging || !draggedObjectRef.current) {
        if (getObjectAtPosition(x, y)) {
          canvas.style.cursor = "grab";
        } else {
          canvas.style.cursor = "default";
        }
        return;
      }

      canvas.style.cursor = "grabbing";
      updateDrag(x, y);

      if (state.dragOffsetX !== undefined && state.dragOffsetY !== undefined) {
        const newX = draggedObjectRef.current.x + state.dragOffsetX;
        const newY = draggedObjectRef.current.y + state.dragOffsetY;

        const snappedX = snapToGridValue(newX);
        const snappedY = snapToGridValue(newY);

        if (snappedX >= 0 && snappedX <= width && snappedY >= 0 && snappedY <= height) {
          setCurrentObjects((prev) =>
            prev.map((obj) =>
              obj.id === draggedObjectRef.current!.id
                ? { ...obj, x: snappedX, y: snappedY }
                : obj
            )
          );
        }
      }
    },
    [state.isDragging, state.dragOffsetX, state.dragOffsetY, getObjectAtPosition, updateDrag, snapToGridValue, width, height]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state.isDragging || !draggedObjectRef.current) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = "default";
      }

      const movedObject = draggedObjectRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;

      const finalX = e.clientX - rect.left;
      const finalY = e.clientY - rect.top;

      const snappedX = snapToGridValue(finalX);
      const snappedY = snapToGridValue(finalY);

      moveObject({
        objectId: movedObject.id,
        fromX: movedObject.x,
        fromY: movedObject.y,
        toX: snappedX,
        toY: snappedY,
        snappedToGrid: snapToGrid,
      } as MoveData);

      endDrag();
      draggedObjectRef.current = null;
    },
    [state.isDragging, moveObject, endDrag, snapToGridValue, snapToGrid]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    if (snapToGrid) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }

    let renderCount = 0;
    const totalObjects = currentObjects.length;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);
      
      if (snapToGrid) {
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
      }

      currentObjects.forEach((obj) => {
        const isSelected = state.selectedObjects.some((s) => s.id === obj.id);
        const imageUrl = (obj as any).imageUrl;

        if (imageUrl) {
          if (!imageCache.current[imageUrl]) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
              imageCache.current[imageUrl] = img;
              render();
            };
          } else {
            const img = imageCache.current[imageUrl];
            const size = obj.radius * 2.5;
            ctx.drawImage(img, obj.x - size / 2, obj.y - size / 2, size, size);
          }
        } else {
          ctx.fillStyle = isSelected ? "#FF6B6B" : "#4ECDC4";
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isSelected) {
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    };

    render();
  }, [currentObjects, state.selectedObjects, width, height, gridSize, snapToGrid]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-default w-full h-full object-contain"
      />
    </div>
  );
};
