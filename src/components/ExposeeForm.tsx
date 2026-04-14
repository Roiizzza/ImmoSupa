import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, GripVertical, Plus, Trash2, Type, Droplets, ChevronDown, X, Upload, Image, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExposeeData {
  headline: string;
  objekttyp: string;
  baujahr: string;
  wohnflaeche: string;
  grundstueck: string;
  zimmer: string;
  schlafzimmer: string;
  badezimmer: string;
  kaufpreis: string;
  kaltmiete: string;
  energieausweis: string;
  beschreibung: string;
  ausstattung: string;
  lage: string;
  highlights: string;
  // New fields
  angebotstyp: "kauf" | "miete";
  immobilientyp: "haus" | "wohnung";
  heizungsart: string;
  sanierungsstand: string;
  bezugsfrei: string;
  stellplaetze: string;
  balkon: string;
  keller: string;
  etage: string;
  provision: string;
  hausgeld: string;
}

const defaultData: ExposeeData = {
  headline: "",
  objekttyp: "",
  baujahr: "",
  wohnflaeche: "",
  grundstueck: "–",
  zimmer: "",
  schlafzimmer: "",
  badezimmer: "",
  kaufpreis: "",
  kaltmiete: "",
  energieausweis: "",
  beschreibung: "",
  ausstattung: "",
  lage: "",
  highlights: "",
  angebotstyp: "kauf",
  immobilientyp: "wohnung",
  heizungsart: "",
  sanierungsstand: "",
  bezugsfrei: "",
  stellplaetze: "",
  balkon: "",
  keller: "",
  etage: "",
  provision: "",
  hausgeld: "",
};

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: "Inter (Standard)" },
  { value: "'Georgia', serif", label: "Georgia (Klassisch)" },
  { value: "'Playfair Display', serif", label: "Playfair (Elegant)" },
  { value: "'Montserrat', sans-serif", label: "Montserrat (Modern)" },
  { value: "'Merriweather', serif", label: "Merriweather (Edel)" },
  { value: "'Roboto', sans-serif", label: "Roboto (Clean)" },
];

interface TextBlock {
  id: string;
  title: string;
  content: string;
}

interface ExposeeFormProps {
  onSave: (data: ExposeeData, images?: string[], captions?: string[], extraBlocks?: TextBlock[], watermarkText?: string, selectedGrundrisse?: string[]) => void;
  initialData?: ExposeeData;
  imageUrls?: string[];
  bildunterschriften?: string[];
  grundriss3dUrls?: string[];
  showGrundriss?: boolean;
}

export type { TextBlock };

const ExposeeForm = ({ onSave, initialData, imageUrls = [], bildunterschriften = [], grundriss3dUrls = [], showGrundriss = true }: ExposeeFormProps) => {
  const [data, setData] = useState<ExposeeData>({ ...defaultData, ...initialData });
  const [images, setImages] = useState<string[]>(imageUrls);
  const [captions, setCaptions] = useState<string[]>(bildunterschriften);
  const [extraBlocks, setExtraBlocks] = useState<TextBlock[]>([]);
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("ENTWURF");
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [selectedGrundrisse, setSelectedGrundrisse] = useState<Set<number>>(new Set(grundriss3dUrls.map((_, i) => i)));
  const [allGrundrisse, setAllGrundrisse] = useState<string[]>(grundriss3dUrls);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const grundrissUploadRef = useRef<HTMLInputElement>(null);

  const update = (key: keyof ExposeeData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newImages = [...images];
    const newCaptions = [...captions];
    const [movedImg] = newImages.splice(dragIndex, 1);
    const [movedCap] = newCaptions.splice(dragIndex, 1);
    newImages.splice(index, 0, movedImg);
    newCaptions.splice(index, 0, movedCap || "");
    setImages(newImages);
    setCaptions(newCaptions);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, value: string) => {
    setCaptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addTextBlock = () => {
    setExtraBlocks((prev) => [...prev, { id: crypto.randomUUID(), title: "", content: "" }]);
  };

  const updateBlock = (id: string, field: "title" | "content", value: string) => {
    setExtraBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBlock = (id: string) => {
    setExtraBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleGrundriss = (index: number) => {
    setSelectedGrundrisse((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
        setCaptions((prev) => [...prev, ""]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleGrundrissUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAllGrundrisse((prev) => [...prev, reader.result as string]);
        setSelectedGrundrisse((prev) => new Set([...prev, allGrundrisse.length + prev.size]));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeGrundriss = (index: number) => {
    setAllGrundrisse((prev) => prev.filter((_, i) => i !== index));
    setSelectedGrundrisse((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const handleSave = () => {
    const selected = allGrundrisse.filter((_, i) => selectedGrundrisse.has(i));
    onSave(data, images, captions, extraBlocks.filter((b) => b.content.trim()), watermark ? watermarkText : undefined, selected);
  };

  const Field = ({ label, field, type = "input" }: { label: string; field: keyof ExposeeData; type?: "input" | "textarea" }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          value={data[field]}
          onChange={(e) => update(field, e.target.value)}
          className="min-h-[120px] bg-background border-border focus:ring-2 focus:ring-primary/20 resize-y"
        />
      ) : (
        <Input
          value={data[field]}
          onChange={(e) => update(field, e.target.value)}
          className="bg-background border-border focus:ring-2 focus:ring-primary/20"
        />
      )}
    </div>
  );

  const ToggleButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">KI-generiert – alle Felder bearbeitbar</span>
      </div>

      {/* Toolbar */}
      <div className="surface-elevated rounded-2xl p-4 flex flex-wrap items-center gap-4">
        {/* Font Picker */}
        <div className="relative">
          <button
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
          >
            <Type className="w-4 h-4 text-muted-foreground" />
            <span>{FONT_OPTIONS.find((f) => f.value === selectedFont)?.label || "Schriftart"}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showFontPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[220px]"
              >
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => { setSelectedFont(font.value); setShowFontPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors ${
                      selectedFont === font.value ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Watermark Toggle + Text */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWatermark(!watermark)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              watermark ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent text-foreground"
            }`}
          >
            <Droplets className="w-4 h-4" />
            Wasserzeichen {watermark ? "An" : "Aus"}
          </button>
          {watermark && (
            <Input
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Wasserzeichen-Text…"
              className="h-9 w-40 text-sm bg-background border-border"
            />
          )}
        </div>

        {/* Add Text Block */}
        <button
          onClick={addTextBlock}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm text-foreground"
        >
          <Plus className="w-4 h-4" />
          Textblock hinzufügen
        </button>
      </div>

      {/* Angebotstyp & Immobilientyp */}
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Art des Angebots</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Angebotstyp</Label>
            <div className="flex gap-2">
              <ToggleButton label="Kauf" active={data.angebotstyp === "kauf"} onClick={() => update("angebotstyp", "kauf")} />
              <ToggleButton label="Miete" active={data.angebotstyp === "miete"} onClick={() => update("angebotstyp", "miete")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Immobilientyp</Label>
            <div className="flex gap-2">
              <ToggleButton label="Haus" active={data.immobilientyp === "haus"} onClick={() => update("immobilientyp", "haus")} />
              <ToggleButton label="Wohnung" active={data.immobilientyp === "wohnung"} onClick={() => update("immobilientyp", "wohnung")} />
            </div>
          </div>
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Exposé-Headline</Label>
        <Input
          value={data.headline}
          onChange={(e) => update("headline", e.target.value)}
          className="text-lg font-semibold bg-background border-border focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 1. Basisdaten – Hero-relevant */}
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">1. Basisdaten (Hero-Bereich)</h3>
        <p className="text-xs text-muted-foreground">Diese Daten erscheinen prominent im Exposé-Kopf – ohne Scrollen sichtbar.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Objekttyp" field="objekttyp" />
          {data.angebotstyp === "kauf" ? (
            <Field label="Kaufpreis (€)" field="kaufpreis" />
          ) : (
            <Field label="Kaltmiete (€)" field="kaltmiete" />
          )}
          <Field label="Wohnfläche (m²)" field="wohnflaeche" />
          <Field label="Zimmer" field="zimmer" />
          {data.immobilientyp === "haus" && (
            <Field label="Grundstück (m²)" field="grundstueck" />
          )}
          <Field label="Lage / Adresse" field="lage" />
        </div>
      </div>

      {/* 2. Technischer Zustand */}
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">2. Technischer Zustand</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Baujahr" field="baujahr" />
          <Field label="Sanierungsstand" field="sanierungsstand" />
          <Field label="Energieeffizienzklasse" field="energieausweis" />
          <Field label="Heizungsart" field="heizungsart" />
          <Field label="Bezugsfrei ab" field="bezugsfrei" />
        </div>
      </div>

      {/* 3. Komfort & Logistik */}
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">3. Komfort & Logistik</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Schlafzimmer" field="schlafzimmer" />
          <Field label="Badezimmer" field="badezimmer" />
          <Field label="Stellplätze / Garage" field="stellplaetze" />
          <Field label="Balkon / Terrasse / Garten" field="balkon" />
          <Field label="Keller / Nutzfläche" field="keller" />
          <Field label="Etage & Aufzug" field="etage" />
        </div>
      </div>

      {/* 4. Rechtliches */}
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">4. Rechtliches</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Provision für Käufer" field="provision" />
          {data.immobilientyp === "wohnung" && (
            <Field label="Hausgeld (€/Monat)" field="hausgeld" />
          )}
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-6">
        <Field label="Objektbeschreibung" field="beschreibung" type="textarea" />
        <Field label="Ausstattung" field="ausstattung" type="textarea" />
        <Field label="Highlights" field="highlights" type="textarea" />
      </div>

      {/* Extra Text Blocks */}
      <AnimatePresence>
        {extraBlocks.map((block) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="surface-elevated rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Input
                value={block.title}
                onChange={(e) => updateBlock(block.id, "title", e.target.value)}
                placeholder="Abschnittstitel (optional)"
                className="text-sm font-semibold border-none bg-transparent p-0 h-auto focus:ring-0 placeholder:text-muted-foreground/50"
              />
              <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, "content", e.target.value)}
              placeholder="Inhalt eingeben…"
              className="min-h-[80px] bg-background border-border resize-y"
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 3D Grundrisse - only shown if showGrundriss is true */}
      {showGrundriss && (
      <div className="surface-elevated rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">3D-Grundrisse</h3>
            <p className="text-xs text-muted-foreground mt-1">KI-generierte Grundrisse auswählen oder eigene hochladen.</p>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              ⚠️ Hinweis: Die KI-generierte 3D-Ansicht kann Abweichungen vom Original aufweisen. Bitte überprüfen Sie die Darstellung auf Richtigkeit.
            </p>
          </div>
          <div>
            <input ref={grundrissUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGrundrissUpload} />
            <Button variant="outline" size="sm" onClick={() => grundrissUploadRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Grundriss hochladen
            </Button>
          </div>
        </div>
        {allGrundrisse.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {allGrundrisse.map((url, i) => {
              const isSelected = selectedGrundrisse.has(i);
              return (
                <div
                  key={`gr-${i}`}
                  onClick={() => toggleGrundriss(i)}
                  className={`relative group rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border opacity-50 hover:opacity-80"
                  }`}
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img src={url} alt={`3D-Grundriss ${i + 1}`} className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute top-2 right-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 bg-white/80" />
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeGrundriss(i); }}
                    className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="p-2 text-center">
                    <span className="text-xs text-muted-foreground">{i < grundriss3dUrls.length ? "KI-generiert" : "Hochgeladen"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Image className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Keine Grundrisse vorhanden</p>
          </div>
        )}
      </div>
      )}

      {/* Image Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Bilder ({images.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Ziehen Sie die Bilder um die Reihenfolge zu ändern. Das erste Bild wird als Titelbild verwendet.</p>
          </div>
          <div>
            <input ref={imageUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            <Button variant="outline" size="sm" onClick={() => imageUploadRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Bilder hochladen
            </Button>
          </div>
        </div>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div
                key={`img-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                  dragIndex === i ? "border-primary scale-95 opacity-70" : "border-border hover:border-primary/40"
                } ${i === 0 ? "ring-2 ring-primary/30" : ""}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={img} alt={captions[i] || `Bild ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <div className="w-6 h-6 rounded-md bg-black/50 text-white flex items-center justify-center">
                    <GripVertical className="w-3 h-3" />
                  </div>
                  {i === 0 && (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Titelbild</span>
                  )}
                </div>
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="p-2">
                  <Input
                    value={captions[i] || ""}
                    onChange={(e) => updateCaption(i, e.target.value)}
                    placeholder="Bildunterschrift…"
                    className="text-xs h-7 border-none bg-transparent p-0 focus:ring-0 placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Image className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Noch keine Bilder vorhanden</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => imageUploadRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Bilder hochladen
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSave}
          className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 px-8 text-base"
        >
          <Save className="w-4 h-4 mr-2" />
          Weiter zur Vorschau
        </Button>
      </div>
    </motion.div>
  );
};

export default ExposeeForm;
export type { ExposeeData };
