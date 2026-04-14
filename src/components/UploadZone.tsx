import { useCallback, useState } from "react";
import { Upload, FileText, Image, X, Camera, FileSpreadsheet, LayoutGrid, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: "image" | "document" | "grundriss";
}

interface UploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  additionalNotes?: string;
  onAdditionalNotesChange?: (notes: string) => void;
  showGrundriss?: boolean;
}

const UploadZone = ({ files, onFilesChange, additionalNotes = "", onAdditionalNotesChange, showGrundriss = false }: UploadZoneProps) => {
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isDraggingInfos, setIsDraggingInfos] = useState(false);
  const [isDraggingGrundriss, setIsDraggingGrundriss] = useState(false);

  const imageFiles = files.filter((f) => f.type === "image");
  const docFiles = files.filter((f) => f.type === "document");
  const grundrissFiles = files.filter((f) => f.type === "grundriss");

  const handleFiles = useCallback(
    (fileList: FileList, forceType?: "image" | "document" | "grundriss") => {
      const newFiles: UploadedFile[] = Array.from(fileList).map((file) => {
        const isImage = file.type.startsWith("image/");
        const type = forceType || (isImage ? "image" : "document");
        return {
          id: crypto.randomUUID(),
          file,
          preview: isImage ? URL.createObjectURL(file) : undefined,
          type,
        };
      });
      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange]
  );

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INFOS - Documents */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Infos & Dokumente</h3>
              <p className="text-xs text-amber-600 font-medium">Höchste Priorität für KI-Analyse</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingInfos(true); }}
            onDragLeave={() => setIsDraggingInfos(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingInfos(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, "document"); }}
            onClick={() => document.getElementById("info-input")?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[180px] flex flex-col items-center justify-center",
              isDraggingInfos ? "border-amber-500 bg-amber-50 scale-[1.02]" : "border-amber-300/50 hover:border-amber-400 hover:bg-amber-50/50"
            )}
          >
            <input id="info-input" type="file" multiple accept=".pdf,.doc,.docx,.txt,.csv,.rtf,.xls,.xlsx,.json,.xml,.md" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files, "document")} />
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-foreground">Dokumente ablegen</p>
            <p className="text-xs text-muted-foreground mt-1">TXT, PDF, CSV, DOCX, XLSX</p>
          </div>

          <AnimatePresence>
            {docFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {docFiles.map((f) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="relative group flex items-center gap-3 surface-elevated rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-sm text-foreground truncate flex-1">{f.file.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{(f.file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <PenLine className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-foreground">Ergänzungen & Notizen</span>
              <span className="text-[10px] text-amber-600 font-medium">(wird bei Analyse berücksichtigt)</span>
            </div>
            <Textarea
              placeholder="Zusätzliche Infos hier eingeben, z.B. besondere Ausstattung, Verkaufsargumente, Adresse, Preisvorstellung…"
              value={additionalNotes}
              onChange={(e) => onAdditionalNotesChange?.(e.target.value)}
              className="min-h-[100px] border-amber-300/50 focus-visible:ring-amber-400 text-sm resize-y"
            />
          </div>
        </div>

        {/* FOTOS - Images */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Fotos</h3>
              <p className="text-xs text-muted-foreground">Werden im Exposé eingebunden</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingPhotos(true); }}
            onDragLeave={() => setIsDraggingPhotos(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingPhotos(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, "image"); }}
            onClick={() => document.getElementById("photo-input")?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[180px] flex flex-col items-center justify-center",
              isDraggingPhotos ? "border-primary bg-accent scale-[1.02]" : "border-border hover:border-primary/40 hover:bg-accent/50"
            )}
          >
            <input id="photo-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files, "image")} />
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-3">
              <Image className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Fotos ablegen</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
          </div>

          <AnimatePresence>
            {imageFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
                {imageFiles.map((f) => (
                  <motion.div key={f.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* GRUNDRISS - Floor plan (admin only) */}
      {showGrundriss && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Grundriss → 3D Generator</h3>
              <p className="text-xs text-emerald-600 font-medium">KI erstellt einen 3D-Grundriss aus Ihrem Plan</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingGrundriss(true); }}
            onDragLeave={() => setIsDraggingGrundriss(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingGrundriss(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files, "grundriss"); }}
            onClick={() => document.getElementById("grundriss-input")?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-300 flex items-center gap-6",
              isDraggingGrundriss ? "border-emerald-500 bg-emerald-50 scale-[1.01]" : "border-emerald-300/50 hover:border-emerald-400 hover:bg-emerald-50/30"
            )}
          >
            <input id="grundriss-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files, "grundriss")} />
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">2D-Grundriss hochladen</p>
              <p className="text-xs text-muted-foreground mt-0.5">Die KI wandelt Ihren Grundriss in eine realistische 3D-Ansicht um</p>
            </div>
          </div>

          <AnimatePresence>
            {grundrissFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                {grundrissFiles.map((f) => (
                  <motion.div key={f.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/50" style={{ width: "140px" }}>
                    {f.preview && <img src={f.preview} alt={f.file.name} className="w-full aspect-square object-contain p-2" />}
                    <div className="px-2 pb-2">
                      <p className="text-[10px] text-emerald-700 font-medium truncate">{f.file.name}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
export type { UploadedFile };
