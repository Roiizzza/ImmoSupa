import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import type { ExposeeData, TextBlock } from "./ExposeeForm";
import { designTemplates, type DesignTemplate } from "./designTemplates";
import { MapPin, Home, Calendar, Ruler, BedDouble, Bath, Euro, Leaf, FileDown, Check, Loader2, Sparkles, Star, Award, Gem, Flame, Car, Trees, ArrowUpDown, Key, Banknote, DoorOpen, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface ExposeePreviewProps {
  data: ExposeeData;
  images?: string[];
  bildunterschriften?: string[];
  grundriss3dUrls?: string[];
  extraBlocks?: TextBlock[];
  watermarkText?: string;
}

// Helper: check if a value is "present" (not empty, not "–", not undefined)
const hasValue = (v: string | undefined) => v && v.trim() !== "" && v.trim() !== "–" && v.trim() !== "undefined";

export interface ExposeePreviewHandle {
  exportPDF: () => Promise<void>;
  isExporting: boolean;
}

const ExposeePreview = forwardRef<ExposeePreviewHandle, ExposeePreviewProps>(({ data, images = [], bildunterschriften = [], grundriss3dUrls = [], extraBlocks = [], watermarkText }, ref) => {
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate>(designTemplates[0]);
  const [exporting, setExporting] = useState(false);
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);


  const d = selectedDesign;

  const isKauf = data.angebotstyp !== "miete";
  const priceLabel = isKauf ? "Kaufpreis" : "Kaltmiete";
  const priceValue = isKauf ? data.kaufpreis : data.kaltmiete;

  // Hero facts – always visible without scrolling
  const heroFacts = [
    { icon: Euro, label: priceLabel, value: hasValue(priceValue) ? `${priceValue} €` : undefined },
    { icon: Ruler, label: "Wohnfläche", value: hasValue(data.wohnflaeche) ? `${data.wohnflaeche} m²` : undefined },
    { icon: Home, label: "Zimmer", value: hasValue(data.zimmer) ? data.zimmer : undefined },
    { icon: Ruler, label: "Grundstück", value: hasValue(data.grundstueck) ? `${data.grundstueck} m²` : undefined },
    { icon: MapPin, label: "Lage", value: hasValue(data.lage) ? (data.lage.length > 40 ? data.lage.substring(0, 40) + "…" : data.lage) : undefined },
  ].filter((f) => f.value);

  // Technical facts
  const techFacts = [
    { icon: Calendar, label: "Baujahr", value: data.baujahr, extra: hasValue(data.sanierungsstand) ? `, ${data.sanierungsstand}` : "" },
    { icon: Leaf, label: "Energieeffizienz", value: data.energieausweis },
    { icon: Flame, label: "Heizung", value: data.heizungsart },
    { icon: Key, label: "Bezugsfrei ab", value: data.bezugsfrei },
  ].filter((f) => hasValue(f.value));

  // Comfort facts
  const comfortFacts = [
    { icon: BedDouble, label: "Schlafzimmer", value: data.schlafzimmer },
    { icon: Bath, label: "Badezimmer", value: data.badezimmer },
    { icon: Car, label: "Stellplätze", value: data.stellplaetze },
    { icon: Trees, label: "Balkon/Terrasse/Garten", value: data.balkon },
    { icon: Warehouse, label: "Keller", value: data.keller },
    { icon: ArrowUpDown, label: "Etage & Aufzug", value: data.etage },
  ].filter((f) => hasValue(f.value));

  // Legal facts
  const legalFacts = [
    { icon: Banknote, label: "Provision", value: data.provision },
    { icon: Euro, label: "Hausgeld", value: hasValue(data.hausgeld) ? `${data.hausgeld} €/Monat` : undefined },
  ].filter((f) => hasValue(f.value));

  const heroImage = images[0];
  const galleryImages = images.slice(1);

  const impressionItems = galleryImages.map((img, i) => ({
    src: img,
    caption: bildunterschriften[i + 1] || `Bild ${i + 2}`,
  }));

  const itemsPerPage = d.impressionImageSize === "large" ? 2 : 3;
  const impressionPages: typeof impressionItems[] = [];
  for (let i = 0; i < impressionItems.length; i += itemsPerPage) {
    impressionPages.push(impressionItems.slice(i, i + itemsPerPage));
  }

  // 3D floor plans: 2 per page
  const grundrissPages: string[][] = [];
  for (let i = 0; i < grundriss3dUrls.length; i += 2) {
    grundrissPages.push(grundriss3dUrls.slice(i, i + 2));
  }

  const heroOverlayStyle = () => {
    switch (d.heroOverlay) {
      case "gradient-bottom": return `linear-gradient(to top, ${d.primary}ee, ${d.primary}44, transparent)`;
      case "gradient-diagonal": return `linear-gradient(135deg, ${d.primary}dd, transparent 70%)`;
      case "vignette": return `radial-gradient(ellipse at center, transparent 40%, ${d.primary}cc 100%)`;
      case "solid-bar": return `linear-gradient(to top, ${d.primary}ff 0%, ${d.primary}ee 30%, transparent 60%)`;
      default: return "linear-gradient(to top, rgba(0,0,0,0.5), transparent)";
    }
  };

  const sectionIcon = () => {
    switch (d.id) {
      case "premium": case "luxus": return <Gem className="w-4 h-4" style={{ color: d.accent }} />;
      case "bold": return <Star className="w-4 h-4" style={{ color: d.accent }} />;
      case "natur": return <Leaf className="w-4 h-4" style={{ color: d.accent }} />;
      case "elegant": return <Award className="w-4 h-4" style={{ color: d.accent }} />;
      default: return <Sparkles className="w-4 h-4" style={{ color: d.accent }} />;
    }
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => {
    if (d.sectionDivider === "accent-line") {
      return <h2 className="text-lg font-bold mb-4" style={{ borderBottom: `3px solid ${d.accent}`, paddingBottom: "8px", display: "inline-block" }}>{children}</h2>;
    }
    if (d.sectionDivider === "full-line") {
      return <div className="mb-4" style={{ borderBottom: `1px solid ${d.text}22` }}><h2 className="text-lg font-bold pb-2">{children}</h2></div>;
    }
    if (d.sectionDivider === "icon") {
      return <div className="flex items-center gap-2 mb-4">{sectionIcon()}<h2 className="text-lg font-bold">{children}</h2></div>;
    }
    if (d.sectionDivider === "dot") {
      return <div className="flex items-center gap-3 mb-4"><div className="w-2 h-2 rounded-full" style={{ background: d.accent }} /><h2 className="text-lg font-bold uppercase tracking-wider text-sm">{children}</h2><div className="flex-1 h-px" style={{ background: `${d.accent}33` }} /></div>;
    }
    return <h2 className="text-lg font-bold mb-4">{children}</h2>;
  };

  const renderFactRow = (facts: { icon: any; label: string; value?: string; extra?: string }[]) => (
    <div className="space-y-2" style={{ borderLeft: `3px solid ${d.accent}`, paddingLeft: "16px" }}>
      {facts.map((fact, i) => (
        <div key={i} className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${d.text}0a` }}>
          <div className="flex items-center gap-2">
            <fact.icon className="w-4 h-4" style={{ color: d.accent }} />
            <span className="text-xs opacity-70">{fact.label}</span>
          </div>
          <span className="text-sm font-bold">{fact.value}{fact.extra || ""}</span>
        </div>
      ))}
    </div>
  );

  const renderImpressionItem = (item: { src: string; caption: string }, index: number) => (
    <div key={index} style={{ border: `1px solid ${d.text}15`, borderRadius: d.cornerRadius, overflow: "hidden", background: d.secondary }}>
      <div style={{ aspectRatio: "16/10", overflow: "hidden" }}>
        <img src={item.src} alt={item.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${d.text}10` }}>
        <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>{item.caption}</p>
      </div>
    </div>
  );

  const renderImpressionGrid = (items: typeof impressionItems) => (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item, i) => renderImpressionItem(item, i))}
    </div>
  );

  const WatermarkOverlay = () => {
    if (!watermarkText) return null;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
        <p style={{ fontSize: "64px", fontWeight: 900, color: `${d.text}12`, transform: "rotate(-35deg)", letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap", userSelect: "none" }}>
          {watermarkText}
        </p>
      </div>
    );
  };

  const PageFooter = () => (
    <div style={{ position: "absolute", bottom: "24px", left: "40px", right: "40px", textAlign: "center", borderTop: `1px solid ${d.text}11`, paddingTop: "12px" }}>
      <p className="text-xs" style={{ opacity: 0.3 }}>Erstellt mit exposé.ai</p>
    </div>
  );

  const pageStyle: React.CSSProperties = {
    width: "794px",
    minHeight: "1123px",
    background: d.bg,
    color: d.text,
    fontFamily: d.fontFamily,
    padding: "0",
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageElements = pagesRef.current.filter(Boolean) as HTMLDivElement[];
      for (let i = 0; i < pageElements.length; i++) {
        const canvas = await html2canvas(pageElements[i], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: d.bg, logging: false, width: 794, height: 1123 });
        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }
      const filename = `Expose_${(data.headline || "Immobilie").substring(0, 30).replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}.pdf`;
      pdf.save(filename);
      toast.success("PDF erfolgreich exportiert!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("PDF-Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
    isExporting: exporting,
  }));

  const setPageRef = (index: number) => (el: HTMLDivElement | null) => {
    pagesRef.current[index] = el;
  };

  let pageIndex = 0;

  return (
    <div className="space-y-8">
      {/* Design Template Selector */}
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Design wählen</h3>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {designTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedDesign(template)}
              className={`relative group rounded-xl p-2 border-2 transition-all ${
                selectedDesign.id === template.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="aspect-[3/4] rounded-lg overflow-hidden mb-1.5">
                <div className="w-full h-1/3" style={{ background: template.primary }} />
                <div className="w-full h-2/3 p-1" style={{ background: template.bg }}>
                  <div className="w-full h-1 rounded mb-0.5" style={{ background: template.text, opacity: 0.3 }} />
                  <div className="w-3/4 h-0.5 rounded mb-0.5" style={{ background: template.text, opacity: 0.15 }} />
                  <div className="w-1/2 h-0.5 rounded" style={{ background: template.text, opacity: 0.15 }} />
                </div>
              </div>
              <p className="text-[10px] font-medium text-foreground leading-tight">{template.name}</p>
              <p className="text-[8px] text-muted-foreground leading-tight">{template.description}</p>
              {selectedDesign.id === template.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center gap-6">

        {/* PAGE 1: DECKBLATT / COVER */}
        <div ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
          <WatermarkOverlay />
          {/* Hero Image with overlay */}
          {heroImage ? (
            <div style={{ position: "relative", height: "480px" }}>
              <img src={heroImage} alt={bildunterschriften[0] || "Immobilie"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: heroOverlayStyle() }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 40px" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-2" style={{ color: d.accent }}>
                  {data.objekttyp || "EXPOSÉ"}
                </p>
                <h1 className="text-3xl font-bold text-white leading-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  {data.headline}
                </h1>
              </div>
            </div>
          ) : (
            <div style={{ height: "280px", background: d.primary, display: "flex", alignItems: "flex-end", padding: "32px 40px" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-2" style={{ color: d.accent }}>
                  {data.objekttyp || "EXPOSÉ"}
                </p>
                <h1 className="text-3xl font-bold text-white">{data.headline}</h1>
              </div>
            </div>
          )}

          {/* Hero Key Facts Bar – visible without scrolling */}
          {heroFacts.length > 0 && (
            <div style={{ background: d.secondary, padding: "16px 40px", borderBottom: `2px solid ${d.accent}33` }}>
              <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
                {heroFacts.map((fact, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <fact.icon className="w-4 h-4" style={{ color: d.accent }} />
                    <span className="text-xs opacity-60">{fact.label}:</span>
                    <span className="text-sm font-bold">{fact.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description below hero */}
          <div style={{ padding: "28px 40px" }}>
            {hasValue(data.beschreibung) && (
              <div>
                <SectionHeading>Objektbeschreibung</SectionHeading>
                <p className="text-sm leading-relaxed opacity-80 mt-1">{data.beschreibung}</p>
              </div>
            )}
          </div>

          <PageFooter />
        </div>

        {/* PAGE 2: Technischer Zustand + Komfort + Rechtliches + Ausstattung */}
        {(techFacts.length > 0 || comfortFacts.length > 0 || legalFacts.length > 0 || hasValue(data.ausstattung) || hasValue(data.highlights)) && (
          <div ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
            <WatermarkOverlay />
            <div style={{ padding: "48px 40px" }} className="space-y-7">
              {techFacts.length > 0 && (
                <div>
                  <SectionHeading>Technischer Zustand</SectionHeading>
                  <div className="mt-2">{renderFactRow(techFacts)}</div>
                </div>
              )}

              {comfortFacts.length > 0 && (
                <div>
                  <SectionHeading>Komfort & Ausstattung</SectionHeading>
                  <div className="mt-2">{renderFactRow(comfortFacts)}</div>
                </div>
              )}

              {legalFacts.length > 0 && (
                <div>
                  <SectionHeading>Rechtliches</SectionHeading>
                  <div className="mt-2">{renderFactRow(legalFacts)}</div>
                </div>
              )}

              {hasValue(data.ausstattung) && (
                <div>
                  <SectionHeading>Ausstattungsmerkmale</SectionHeading>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.ausstattung.split(",").map((item, i) => (
                      <span key={i} className="px-3 py-1.5 text-xs font-medium" style={{ background: d.secondary, border: `1px solid ${d.accent}33`, borderRadius: d.factStyle === "pills" ? "999px" : d.cornerRadius }}>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasValue(data.highlights) && (
                <div>
                  <SectionHeading>Highlights</SectionHeading>
                  <div className="mt-2 p-5" style={{ background: d.secondary, borderRadius: d.cornerRadius }}>
                    {data.highlights.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: d.accent }} />
                        <p className="text-sm font-medium">{line.replace(/^[•\-–]\s*/, "")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <PageFooter />
          </div>
        )}

        {/* LAGE PAGE (if lage text is long enough) */}
        {hasValue(data.lage) && data.lage.length > 50 && (
          <div ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
            <WatermarkOverlay />
            <div style={{ padding: "48px 40px" }}>
              <SectionHeading>Lage & Umgebung</SectionHeading>
              <p className="text-sm leading-relaxed opacity-80 mt-2">{data.lage}</p>
            </div>
            <PageFooter />
          </div>
        )}

        {/* EXTRA TEXT BLOCK PAGES – each block gets its own section */}
        {extraBlocks.length > 0 && (
          <div ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
            <WatermarkOverlay />
            <div style={{ padding: "48px 40px" }} className="space-y-8">
              {extraBlocks.map((block, bi) => (
                <div key={block.id || bi}>
                  <SectionHeading>{block.title || `Abschnitt ${bi + 1}`}</SectionHeading>
                  <p className="text-sm leading-relaxed opacity-80 mt-2 whitespace-pre-line">{block.content}</p>
                </div>
              ))}
            </div>
            <PageFooter />
          </div>
        )}

        {/* 3D GRUNDRISS PAGES – 2 per page */}
        {grundrissPages.map((pageUrls, gi) => (
          <div key={`gr-page-${gi}`} ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
            <WatermarkOverlay />
            <div style={{ padding: "48px 40px" }}>
              <SectionHeading>{gi === 0 ? "3D-Grundrisse" : `3D-Grundrisse (Seite ${gi + 1})`}</SectionHeading>
              <div className="space-y-6 mt-4">
                {pageUrls.map((url, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div style={{ borderRadius: d.cornerRadius, overflow: "hidden", border: `1px solid ${d.text}15`, maxWidth: "100%" }}>
                      <img src={url} alt={`3D-Grundriss ${gi * 2 + idx + 1}`} style={{ width: "100%", maxHeight: "460px", display: "block", objectFit: "contain" }} />
                    </div>
                    <p className="text-xs text-center mt-3" style={{ opacity: 0.5 }}>
                      3D-Grundriss {gi * 2 + idx + 1} – schematische Darstellung
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <PageFooter />
          </div>
        ))}

        {/* IMPRESSION PAGES */}
        {impressionPages.map((pageItems, pi) => (
          <div key={`imp-${pi}`} ref={setPageRef(pageIndex++)} style={pageStyle} className="shadow-elevated rounded-lg">
            <WatermarkOverlay />
            <div style={{ padding: "48px 40px" }}>
              {pi === 0 && <SectionHeading>Impressionen</SectionHeading>}
              <div className="space-y-6 mt-2">
                {d.imageLayout === "grid" ? renderImpressionGrid(pageItems) : pageItems.map((item, i) => renderImpressionItem(item, i))}
              </div>
            </div>
            <PageFooter />
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="flex justify-center">
        <Button onClick={handleExportPDF} disabled={exporting} className="h-12 px-8 text-base gradient-primary text-primary-foreground hover:opacity-90">
          {exporting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />PDF wird erstellt…</>
          ) : (
            <><FileDown className="w-4 h-4 mr-2" />Als PDF exportieren</>
          )}
        </Button>
      </div>
    </div>
  );
});

ExposeePreview.displayName = "ExposeePreview";

export default ExposeePreview;
