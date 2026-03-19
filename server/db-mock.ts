/**
 * Mock Database for development when DATABASE_URL is not available
 */

export const mockInventory = [
  {
    id: 1,
    name: "Lavanda",
    type: "flowering",
    imageUrl: "https://images.unsplash.com/photo-1595908129746-57ca1a63dd4d?auto=format&fit=crop&q=80&w=200",
    purchasePrice: "5.00",
    sellingPrice: "12.00",
    stock: 50,
    spacing: "0.40",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Roble Joven",
    type: "tree",
    imageUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=200",
    purchasePrice: "45.00",
    sellingPrice: "120.00",
    stock: 10,
    spacing: "5.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "Boj (Shrub)",
    type: "shrub",
    imageUrl: "https://images.unsplash.com/photo-1584479898061-15742e14f50d?auto=format&fit=crop&q=80&w=200",
    purchasePrice: "15.00",
    sellingPrice: "35.00",
    stock: 25,
    spacing: "0.80",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

let inventory = [...mockInventory];

export const mockQueries = {
  listInventory: async () => inventory,
  getInventoryItemById: async (id: number) => inventory.find(i => i.id === id),
  addInventoryItem: async (data: any) => {
    const newItem = {
      ...data,
      id: inventory.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inventory.push(newItem);
    return newItem;
  },
  updateInventoryStock: async (id: number, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      item.stock = Math.max(0, item.stock + delta);
      item.updatedAt = new Date();
    }
    return item;
  }
};
