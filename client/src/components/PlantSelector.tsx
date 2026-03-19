import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface PlantSelectorProps {
  onSelect: (plant: any) => void;
}

export const PlantSelector: React.FC<PlantSelectorProps> = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();

  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.type.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar planta..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredInventory?.map((item) => (
          <Card 
            key={item.id} 
            className="cursor-pointer hover:border-blue-500 transition-colors group"
            onClick={() => onSelect(item)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-xs text-gray-500 capitalize">{item.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">${item.sellingPrice}</p>
                <p className="text-[10px] text-gray-400">Stock: {item.stock}</p>
              </div>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredInventory?.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No se encontraron plantas.
          </div>
        )}
      </div>
    </div>
  );
};
