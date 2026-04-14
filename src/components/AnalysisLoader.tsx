import { motion } from "framer-motion";
import { Brain, FileSearch, Sparkles, ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UploadedFile } from "@/components/UploadZone";
import type { ExposeeData } from "@/components/ExposeeForm";

const stages = [
  { icon: FileSearch, label: "Dokumente werden ausgelesen…", detail: "Text, PDFs, Tabellen werden verarbeitet" },
  { icon: ImageIcon, label: "Bilder werden analysiert…", detail: "Räume, Ausstattung, Besonderheiten" },
  { icon: Brain, label: "Exposé-Text wird generiert…", detail: "Emotionale Beschreibung & Highlights" },
  { icon: Sparkles, label: "3D-Grundriss wird erstellt…", detail: "KI generiert 3D-Visualisierung" },
];

const TEXT_EXTENSIONS = [".txt", ".csv", ".json", ".xml", ".rtf", ".md", ".log", ".tsv"];
const TEXT_MIME_PREFIXES = ["text/", "application/json", "application/xml"];

function isTextFile(file: File): boolean {
  if (TEXT_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  return TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

/** Convert a blob/object URL to a data URL so it persists beyond the session */
async function blobUrlToDataUrl(url: string): Promise<string> {
  if (!url.startsWith("blob:")) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface AnalysisLoaderProps {
  files: UploadedFile[];
  additionalNotes?: string;
  onComplete: (data: ExposeeData, imageUrls: string[], grundriss3dUrls?: string[]) => void;
  onError: (error: string) => void;
  isAdmin?: boolean;
}

const AnalysisLoader = ({ files, additionalNotes, onComplete, onError, isAdmin = false }: AnalysisLoaderProps) => {
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (done || error) return;
    const interval = setInterval(() => setActiveStage((prev) => (prev + 1) % stages.length), 3000);
    return () => clearInterval(interval);
  }, [done, error]);

  useEffect(() => {
    if (done || error) return;
    const interval = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [done, error]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const analyze = async () => {
      try {
        const grundrissFiles = files.filter((f) => f.type === "grundriss");
        const nonGrundrissFiles = files.filter((f) => f.type !== "grundriss");

        // Convert blob URLs to data URLs for image persistence
        const imageUrls: string[] = await Promise.all(
          nonGrundrissFiles
            .filter((f) => f.type === "image" && f.preview)
            .map((f) => blobUrlToDataUrl(f.preview!))
        );

        const fileData = await Promise.all(
          nonGrundrissFiles.map(async (f) => {
            if (isTextFile(f.file)) {
              const textContent = await f.file.text();
              return { name: f.file.name, type: f.file.type || "text/plain", textContent };
            }
            const buffer = await f.file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return { name: f.file.name, type: f.file.type, base64: btoa(binary) };
          })
        );

        const analyzePromise = nonGrundrissFiles.length > 0
          ? supabase.functions.invoke("analyze-exposee", {
              body: { files: fileData, additionalNotes: additionalNotes || "" },
            })
          : Promise.resolve({ data: null, error: null });

        // Only generate 3D grundriss for admins
        let grundriss3dPromise: Promise<string[]> = Promise.resolve([]);
        if (isAdmin && grundrissFiles.length > 0) {
          grundriss3dPromise = (async () => {
            const promises = grundrissFiles.map(async (grundrissFile) => {
              try {
                const buffer = await grundrissFile.file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const base64 = btoa(binary);

                const { data: grData, error: grError } = await supabase.functions.invoke("generate-3d-grundriss", {
                  body: { imageBase64: base64, mimeType: grundrissFile.file.type || "image/png" },
                });

                if (grError) { console.error("3D Grundriss error:", grError); return null; }
                return grData?.image || null;
              } catch (e) { console.error("3D Grundriss generation failed:", e); return null; }
            });
            const settled = await Promise.all(promises);
            return settled.filter((url): url is string => url !== null);
          })();
        }

        const [{ data, error: fnError }, grundriss3dUrls] = await Promise.all([analyzePromise, grundriss3dPromise]);

        const hasNonGrundrissFiles = nonGrundrissFiles.length > 0;

        if (fnError && hasNonGrundrissFiles) {
          const errMsg = fnError.message || "Analyse fehlgeschlagen";
          if (errMsg.includes("429") || errMsg.includes("Rate")) throw new Error("API-Rate-Limit erreicht. Bitte warten Sie einen Moment.");
          if (errMsg.includes("402") || errMsg.includes("quota") || errMsg.includes("Guthaben")) throw new Error("Das API-Guthaben ist aufgebraucht.");
          throw new Error(errMsg);
        }

        if (hasNonGrundrissFiles && data?.error) throw new Error(data.error);

        const aiData = (hasNonGrundrissFiles && data?.data) ? data.data : {};
        const mappedData: ExposeeData & { bildunterschriften?: string[] } = {
          headline: aiData.headline || aiData.title || "",
          objekttyp: aiData.objekttyp || "",
          baujahr: aiData.baujahr || "",
          wohnflaeche: aiData.wohnflaeche || (aiData.area_sqm ? String(aiData.area_sqm) : ""),
          grundstueck: aiData.grundstueck || "",
          zimmer: aiData.zimmer || (aiData.rooms ? String(aiData.rooms) : ""),
          schlafzimmer: aiData.schlafzimmer || "",
          badezimmer: aiData.badezimmer || "",
          kaufpreis: aiData.kaufpreis || (aiData.price_numeric ? aiData.price_numeric.toLocaleString("de-DE") : ""),
          kaltmiete: aiData.kaltmiete || "",
          energieausweis: aiData.energieausweis || "",
          beschreibung: aiData.beschreibung || aiData.description || "",
          ausstattung: aiData.ausstattung || "",
          lage: aiData.lage || (aiData.address && aiData.address !== "–" ? aiData.address : ""),
          highlights: aiData.highlights || "",
          angebotstyp: aiData.angebotstyp || (aiData.kaltmiete ? "miete" : "kauf"),
          immobilientyp: aiData.immobilientyp || (aiData.objekttyp?.toLowerCase().includes("haus") ? "haus" : "wohnung"),
          heizungsart: aiData.heizungsart || "",
          sanierungsstand: aiData.sanierungsstand || "",
          bezugsfrei: aiData.bezugsfrei || "",
          stellplaetze: aiData.stellplaetze || "",
          balkon: aiData.balkon || "",
          keller: aiData.keller || "",
          etage: aiData.etage || "",
          provision: aiData.provision || "",
          hausgeld: aiData.hausgeld || "",
          bildunterschriften: Array.isArray(aiData.bildunterschriften) ? aiData.bildunterschriften : [],
        };

        let orderedImages = imageUrls;
        let orderedCaptions = mappedData.bildunterschriften || [];
        const order: number[] = Array.isArray(aiData.bildreihenfolge) ? aiData.bildreihenfolge : [];

        if (order.length > 0 && order.length <= imageUrls.length) {
          orderedImages = order.filter((idx: number) => idx >= 0 && idx < imageUrls.length).map((idx: number) => imageUrls[idx]);
          const originalCaptions = Array.isArray(aiData.bildunterschriften) ? aiData.bildunterschriften : [];
          orderedCaptions = order.filter((idx: number) => idx >= 0 && idx < originalCaptions.length).map((idx: number) => originalCaptions[idx]);
          mappedData.bildunterschriften = orderedCaptions;
          for (let i = 0; i < imageUrls.length; i++) {
            if (!order.includes(i)) {
              orderedImages.push(imageUrls[i]);
              if (i < originalCaptions.length) orderedCaptions.push(originalCaptions[i]);
            }
          }
        }

        setDone(true);
        setTimeout(() => onComplete(mappedData, orderedImages, grundriss3dUrls.length > 0 ? grundriss3dUrls : undefined), 1200);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(message);
        onError(message);
      }
    };

    analyze();
  }, [files, onComplete, onError]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-10">
      {error ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Analyse fehlgeschlagen</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </motion.div>
      ) : done ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Analyse abgeschlossen!</h3>
          <p className="text-sm text-muted-foreground">Exposé wird geladen…</p>
        </motion.div>
      ) : (
        <>
          <div className="relative">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center">
              <Brain className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0" style={{ transformOrigin: "center center" }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-md" />
            </motion.div>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-foreground">KI analysiert Ihre Dateien…</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="inline-flex items-center gap-1.5">
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                Live · {formatTime(elapsedSeconds)}
              </span>
            </p>
          </div>

          {/* User Guide */}
          <div className="w-full max-w-md surface-elevated rounded-2xl p-6 space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">💡 So geht es weiter</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <p><span className="font-medium text-foreground">Editor</span> – Sobald die Analyse fertig ist, öffnet sich der Editor. Prüfen und ergänzen Sie alle Felder.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <p><span className="font-medium text-foreground">Vorschau</span> – Wenn alles passt, klicken Sie auf „Weiter zur Vorschau". Das ist Ihr fertiges Exposé.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <p><span className="font-medium text-foreground">Export</span> – Exportieren Sie als PDF oder gehen Sie zurück zum Editor, um Änderungen vorzunehmen.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 w-full max-w-md">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === activeStage;
              return (
                <motion.div key={index} animate={{ opacity: isActive ? 1 : 0.35, scale: isActive ? 1 : 0.97 }} transition={{ duration: 0.4 }} className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${isActive ? "surface-elevated" : ""}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                    <p className="text-xs text-muted-foreground">{stage.detail}</p>
                  </div>
                  {isActive && <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysisLoader;
