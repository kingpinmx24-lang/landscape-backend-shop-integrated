/**
 * Component: DirectedInputPanel
 * ============================================================================
 * Panel para entrada dirigida del usuario (control humano del diseño)
 * Integrado con el Inventario/Tienda Real.
 */

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Send, Lightbulb, ShoppingBag, Plus } from "lucide-react";
import { PlantSelector } from "./PlantSelector";

interface DirectedInputPanelProps {
  onAddPlants?: (plantType: string, quantity: number, location: string, plantData?: any) => void;
  onChangeMaterial?: (material: string, location: string) => void;
  onCustomRequest?: (request: string) => void;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

/**
 * Materiales disponibles
 */
const MATERIALS = [
  { id: "grass", name: "Pasto" },
  { id: "soil", name: "Tierra" },
  { id: "concrete", name: "Concreto" },
  { id: "gravel", name: "Grava" },
];

/**
 * Sugerencias de entrada
 */
const SUGGESTIONS = [
  "Quiero más pasto en el frente",
  "Agregar 3 árboles en la esquina",
  "Cambiar a grava en el lateral",
  "Más flores coloridas aquí",
  "Limpiar esta área",
  "Hacer el diseño más denso",
];

/**
 * Componente DirectedInputPanel
 */
export const DirectedInputPanel: React.FC<DirectedInputPanelProps> = ({
  onAddPlants,
  onChangeMaterial,
  onCustomRequest,
  isLoading = false,
  error,
  success,
}) => {
  const [mode, setMode] = useState<"shop" | "material" | "custom">("shop");
  const [selectedPlant, setSelectedPlant] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [location, setLocation] = useState<string>("");
  const [material, setMaterial] = useState<string>("grass");
  const [customRequest, setCustomRequest] = useState<string>("");

  /**
   * Manejar agregar plantas desde la tienda
   */
  const handleAddFromShop = useCallback(() => {
    if (!selectedPlant || !location.trim()) {
      return;
    }

    if (onAddPlants) {
      onAddPlants(selectedPlant.type, quantity, location, selectedPlant);
      setLocation("");
      setQuantity(1);
      setSelectedPlant(null);
    }
  }, [selectedPlant, quantity, location, onAddPlants]);

  /**
   * Manejar cambio de material
   */
  const handleChangeMaterial = useCallback(() => {
    if (!location.trim()) {
      return;
    }

    if (onChangeMaterial) {
      onChangeMaterial(material, location);
      setLocation("");
    }
  }, [material, location, onChangeMaterial]);

  /**
   * Manejar solicitud personalizada
   */
  const handleCustomRequest = useCallback(() => {
    if (!customRequest.trim()) {
      return;
    }

    if (onCustomRequest) {
      onCustomRequest(customRequest);
      setCustomRequest("");
    }
  }, [customRequest, onCustomRequest]);

  /**
   * Aplicar sugerencia
   */
  const applySuggestion = useCallback((suggestion: string) => {
    setCustomRequest(suggestion);
  }, []);

  return (
    <Card className="w-full shadow-lg border-blue-100">
      <CardHeader className="bg-blue-50/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-600" />
          Tienda e Inventario
        </CardTitle>
        <CardDescription>
          Selecciona plantas reales de tu inventario para el diseño
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Tabs de modo */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setMode("shop")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === "shop"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Tienda de Plantas
          </button>
          <button
            onClick={() => setMode("material")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === "material"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Materiales
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === "custom"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            IA Asistente
          </button>
        </div>

        {/* Modo: Tienda de Plantas */}
        {mode === "shop" && (
          <div className="space-y-4">
            {!selectedPlant ? (
              <PlantSelector onSelect={setSelectedPlant} />
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <img src={selectedPlant.imageUrl} className="w-16 h-16 object-contain bg-white rounded border" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold">{selectedPlant.name}</h4>
                    <p className="text-sm text-blue-600 font-semibold">${selectedPlant.sellingPrice} c/u</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPlant(null)}>Cambiar</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cantidad:</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ubicación:</label>
                    <Input
                      placeholder="Ej: frente, esquina..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddFromShop}
                  disabled={!location.trim() || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isLoading ? "Agregando..." : `Agregar al Diseño ($${(parseFloat(selectedPlant.sellingPrice) * quantity).toFixed(2)})`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modo: Cambiar Material */}
        {mode === "material" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nuevo material:</label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((mat) => (
                    <SelectItem key={mat.id} value={mat.id}>
                      {mat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ubicación:</label>
              <Input
                placeholder="Ej: frente, lateral derecho..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <Button
              onClick={handleChangeMaterial}
              disabled={!location.trim() || isLoading}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? "Cambiando..." : "Cambiar Material"}
            </Button>
          </div>
        )}

        {/* Modo: Solicitud Personalizada */}
        {mode === "custom" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tu solicitud:</label>
              <Textarea
                placeholder="Describe lo que quieres cambiar en el diseño..."
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Lightbulb className="w-3 h-3" />
                Sugerencias:
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => applySuggestion(suggestion)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCustomRequest}
              disabled={!customRequest.trim() || isLoading}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? "Procesando..." : "Enviar Solicitud"}
            </Button>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            ✓ {success}
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-700">
          <p><strong>Regla de Negocio:</strong> Solo se permiten plantas del inventario real para asegurar la disponibilidad y cotización exacta.</p>
        </div>
      </CardContent>
    </Card>
  );
};
