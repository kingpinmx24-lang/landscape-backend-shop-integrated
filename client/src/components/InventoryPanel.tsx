import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Package, DollarSign, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const InventoryPanel: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "flowering" as const,
    imageUrl: "",
    purchasePrice: "",
    sellingPrice: "",
    stock: 0,
    spacing: "1.00",
  });

  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();
  const addMutation = trpc.inventory.add.useMutation({
    onSuccess: () => {
      toast.success("Planta agregada al inventario");
      setIsAdding(false);
      setFormData({
        name: "",
        type: "flowering",
        imageUrl: "",
        purchasePrice: "",
        sellingPrice: "",
        stock: 0,
        spacing: "1.00",
      });
      utils.inventory.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventario de Plantas</h2>
          <p className="text-gray-500">Gestiona las especies disponibles para tus diseños</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "Cancelar" : <><Plus className="w-4 h-4 mr-2" /> Agregar Planta</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle>Nueva Planta (PNG)</CardTitle>
            <CardDescription>Ingresa los datos de la nueva especie. Solo se aceptan formatos PNG con transparencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Planta</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Lavanda, Roble, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: any) => setFormData({...formData, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flowering">Flor</SelectItem>
                    <SelectItem value="shrub">Arbusto</SelectItem>
                    <SelectItem value="tree">Árbol</SelectItem>
                    <SelectItem value="groundcover">Cubre suelos</SelectItem>
                    <SelectItem value="decorative">Decorativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL de Imagen (PNG)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="imageUrl" 
                    value={formData.imageUrl} 
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://ejemplo.com/planta.png"
                    required
                  />
                  {formData.imageUrl && (
                    <div className="w-10 h-10 border rounded bg-white flex items-center justify-center overflow-hidden">
                      <img src={formData.imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Inicial</Label>
                <Input 
                  id="stock" 
                  type="number"
                  value={formData.stock} 
                  onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Precio de Compra ($)</Label>
                <Input 
                  id="purchasePrice" 
                  value={formData.purchasePrice} 
                  onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Precio de Venta ($)</Label>
                <Input 
                  id="sellingPrice" 
                  value={formData.sellingPrice} 
                  onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spacing">Espaciado Mínimo (m)</Label>
                <Input 
                  id="spacing" 
                  value={formData.spacing} 
                  onChange={e => setFormData({...formData, spacing: e.target.value})}
                  placeholder="1.00"
                  required
                />
              </div>
              <div className="md:col-span-2 pt-4">
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : "Guardar en Inventario"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory?.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gray-100 flex items-center justify-center p-4 relative">
              <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
              <div className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-xs font-bold border">
                {item.type.toUpperCase()}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <span className="text-green-600 font-bold">${item.sellingPrice}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Package className="w-3 h-3 mr-1" /> Stock: {item.stock}
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" /> Costo: ${item.purchasePrice}
                </div>
                <div className="flex items-center col-span-2">
                  <ImageIcon className="w-3 h-3 mr-1" /> Espaciado: {item.spacing}m
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {inventory?.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-gray-50">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay plantas en el inventario</h3>
            <p className="text-gray-500">Comienza agregando tu primera especie PNG.</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsAdding(true)}>
              Agregar Planta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
