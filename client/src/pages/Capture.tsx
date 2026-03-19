import React, { useState } from "react";
import { useRoute } from "wouter";
import { CaptureView } from "../components/CaptureView";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";

/**
 * Página de captura de terreno
 */
export default function Capture() {
  const [, params] = useRoute("/projects/:projectId/capture");
  const projectId = params?.projectId ? parseInt(params.projectId) : 0;
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectQuery = trpc.projects.get.useQuery({ id: projectId });
  const saveCaptureQuery = trpc.captures.save.useMutation();

  const handleCapture = async (captureData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convertir imagen a URL (en producción, subirías a S3)
      const imageUrl = URL.createObjectURL(captureData.image);

      // Guardar captura
      await saveCaptureQuery.mutateAsync({
        projectId,
        deviceModel: captureData.deviceModel,
        hasLiDAR: captureData.hasLiDAR,
        cameraType: "fallback",
        measurements: captureData.measurements,
        zones: [],
        imageUrl,
        metadata: {
          timestamp: captureData.timestamp,
        },
      });

      // Redirigir a proyecto
      window.location.href = `/projects/${projectId}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar captura";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6">
          <p className="text-gray-600">Por favor inicia sesión para continuar</p>
        </Card>
      </div>
    );
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Card className="p-6 bg-red-50 border-red-200">
          <h3 className="font-semibold text-red-900">Proyecto no encontrado</h3>
          <p className="text-red-700 text-sm mt-2">No pudimos cargar el proyecto solicitado</p>
        </Card>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{projectQuery.data.name}</h1>
            <p className="text-sm text-gray-500">Captura de terreno</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Capture view */}
      <div className="flex-1 overflow-hidden">
        <CaptureView projectId={projectId} onCapture={handleCapture} />
      </div>

      {/* Status bar */}
      {isSubmitting && (
        <div className="bg-blue-50 border-t border-blue-200 p-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Guardando captura...</span>
        </div>
      )}
    </div>
  );
}
