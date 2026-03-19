import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, LayoutDashboard, Package } from "lucide-react";
import { getLoginUrl } from "@/const";
import { InventoryPanel } from "@/components/InventoryPanel";
import { useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory">("inventory");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-bold text-gray-900">Landscape App</h1>
          <p className="text-gray-600">Inicia sesión para gestionar tu inventario y diseños de paisajismo.</p>
          <Button 
            className="w-full py-6 text-lg" 
            onClick={() => window.location.href = getLoginUrl()}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-blue-600">Landscape Pro</h1>
            <nav className="hidden md:flex gap-4">
              <Button 
                variant={activeTab === "dashboard" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Panel
              </Button>
              <Button 
                variant={activeTab === "inventory" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setActiveTab("inventory")}
              >
                <Package className="w-4 h-4 mr-2" /> Inventario
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {activeTab === "inventory" ? (
          <InventoryPanel />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Proyectos Activos</h3>
                <p className="text-3xl font-bold mt-2">12</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Plantas en Stock</h3>
                <p className="text-3xl font-bold mt-2">450</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500">Ventas del Mes</h3>
                <p className="text-3xl font-bold mt-2">$12,400</p>
              </Card>
            </div>
            <div className="bg-white p-12 rounded-xl border-2 border-dashed text-center">
              <p className="text-gray-500">El panel de control está en desarrollo. Usa la pestaña de Inventario para gestionar tus plantas.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm ${className}`}>
      {children}
    </div>
  );
}
