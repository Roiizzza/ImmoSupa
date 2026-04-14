import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Image, FileText, LayoutGrid, Info } from "lucide-react";
import type { UploadedFile } from "./UploadZone";

interface PriceCalculatorProps {
  files: UploadedFile[];
}

const PriceCalculator = ({ files }: PriceCalculatorProps) => {
  const pricing = useMemo(() => {
    const images = files.filter((f) => f.type === "image");
    const docs = files.filter((f) => f.type === "document");
    const grundrisse = files.filter((f) => f.type === "grundriss");
    const totalSizeMB = files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);

    let price = 5;
    if (images.length > 3) price += Math.ceil((images.length - 3) / 3);
    price += grundrisse.length * 2;
    if (totalSizeMB > 2) price += Math.min(Math.ceil(totalSizeMB / 3), 3);
    price = Math.min(price, 15);

    return {
      price,
      imageCount: images.length,
      docCount: docs.length,
      grundrissCount: grundrisse.length,
      totalSizeMB: totalSizeMB.toFixed(1),
    };
  }, [files]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-elevated rounded-2xl p-5 max-w-md mx-auto"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Preiskalkulation</h3>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between py-1">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Image className="w-3.5 h-3.5" />
            {pricing.imageCount} Foto{pricing.imageCount !== 1 ? "s" : ""}
          </span>
          <span className="text-foreground">inkl.</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {pricing.docCount} Dokument{pricing.docCount !== 1 ? "e" : ""} ({pricing.totalSizeMB} MB)
          </span>
          <span className="text-foreground">inkl.</span>
        </div>
        {pricing.grundrissCount > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LayoutGrid className="w-3.5 h-3.5" />
              {pricing.grundrissCount} × 3D-Grundriss
            </span>
            <span className="text-foreground">+{pricing.grundrissCount * 2} €</span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Geschätzter Preis</span>
        <span className="text-2xl font-bold text-primary">{pricing.price},00 €</span>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Aktuell kostenlos in der Beta-Phase. Preise gelten ab dem offiziellen Launch.
      </p>
    </motion.div>
  );
};

export default PriceCalculator;
