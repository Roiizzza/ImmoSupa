import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ArrowRight, ArrowLeft, Eye, Sparkles, Loader2, FileDown, RotateCcw, Pencil, Save, FolderOpen, LogOut, User, Shield, Wallet, Ticket, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { uploadAllImages } from "@/lib/imageUtils";
import StepIndicator from "@/components/StepIndicator";
import UploadZone, { type UploadedFile } from "@/components/UploadZone";
import AnalysisLoader from "@/components/AnalysisLoader";
import ExposeeForm, { type ExposeeData, type TextBlock } from "@/components/ExposeeForm";
import ExposeePreview, { type ExposeePreviewHandle } from "@/components/ExposeePreview";
import PriceCalculator from "@/components/PriceCalculator";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const steps = [
  { label: "Upload", description: "Dateien hochladen" },
  { label: "Analyse", description: "KI verarbeitet" },
  { label: "Bearbeiten", description: "Exposé anpassen" },
  { label: "Vorschau", description: "Fertig!" },
];

const VIP_COST = 0.40;

const Dashboard = () => {
  const { user, isAdmin, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [exposeeData, setExposeeData] = useState<ExposeeData | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [bildunterschriften, setBildunterschriften] = useState<string[]>([]);
  const [grundriss3dUrls, setGrundriss3dUrls] = useState<string[]>([]);
  const [extraBlocks, setExtraBlocks] = useState<TextBlock[]>([]);
  const [watermarkText, setWatermarkText] = useState<string | undefined>(undefined);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [generatingExample, setGeneratingExample] = useState(false);
  const [currentExposeeId, setCurrentExposeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<ExposeePreviewHandle>(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const has3dAccess = isAdmin || (profile?.has_3d_access ?? false);

  // Load existing exposé if editing
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && user) {
      (async () => {
        const { data, error } = await supabase
          .from("exposees")
          .select("*")
          .eq("id", editId)
          .single();
        if (data && !error) {
          setCurrentExposeeId(data.id);
          setExposeeData(data.data as unknown as ExposeeData);
          setImageUrls(data.image_urls || []);
          setBildunterschriften(data.bildunterschriften || []);
          setGrundriss3dUrls(data.grundriss_3d_urls || []);
          setExtraBlocks((data.extra_blocks as unknown as TextBlock[]) || []);
          setWatermarkText(data.watermark_text || undefined);
          setCurrentStep(2);
        }
      })();
    }
  }, [searchParams, user]);

  const handleSaveToAccount = async () => {
    if (!user || !exposeeData) {
      toast.error("Bitte melden Sie sich an, um zu speichern.");
      return;
    }
    setSaving(true);
    try {
      toast.info("Bilder werden hochgeladen…");
      const persistentImageUrls = await uploadAllImages(user.id, imageUrls);
      setImageUrls(persistentImageUrls);

      let persistentGrundrissUrls = grundriss3dUrls;
      if (grundriss3dUrls.length > 0) {
        persistentGrundrissUrls = await uploadAllImages(user.id, grundriss3dUrls);
        setGrundriss3dUrls(persistentGrundrissUrls);
      }

      const payload = {
        user_id: user.id,
        title: exposeeData.headline || "Unbenanntes Exposé",
        data: exposeeData as any,
        image_urls: persistentImageUrls,
        grundriss_3d_urls: persistentGrundrissUrls,
        bildunterschriften,
        extra_blocks: extraBlocks as any,
        watermark_text: watermarkText || null,
      };

      if (currentExposeeId) {
        const { error } = await supabase.from("exposees").update(payload).eq("id", currentExposeeId);
        if (error) throw error;
        toast.success("Exposé gespeichert!");
      } else {
        const { data, error } = await supabase.from("exposees").insert(payload).select("id").single();
        if (error) throw error;
        setCurrentExposeeId(data.id);
        toast.success("Exposé gespeichert!");
      }
    } catch (err: any) {
      toast.error("Speichern fehlgeschlagen", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateExample = async () => {
    setGeneratingExample(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-example-exposee");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExposeeData(data.exposeeData);
      setImageUrls(data.images || []);
      setBildunterschriften(data.bildunterschriften || []);
      setCurrentStep(3);
      toast.success("Beispiel-Exposé erstellt!");
    } catch (e: any) {
      toast.error("Fehler beim Generieren", { description: e.message });
    } finally {
      setGeneratingExample(false);
    }
  };

  // ===== PAYWALL LOGIC =====
  const handleStartAnalysis = () => {
    if (files.length === 0) return;

    // Prio 1: Admin → free pass
    if (isAdmin) {
      proceedWithAnalysis();
      return;
    }

    // Not logged in → require login
    if (!user) {
      toast.error("Bitte melden Sie sich an, um ein Exposé zu generieren.");
      navigate("/auth");
      return;
    }

    // Blocked check
    if (profile?.is_blocked) {
      toast.error("Ihr Account ist gesperrt. Bitte kontaktieren Sie den Support.");
      return;
    }

    // Show paywall modal for coupon / VIP / standard
    setShowPaywall(true);
  };

  const proceedWithAnalysis = () => {
    setShowPaywall(false);
    setCurrentStep(1);
  };

  const handleCouponRedeem = async () => {
    if (!couponCode.trim() || !user) return;
    setCheckingCoupon(true);
    try {
      const normalizedCode = couponCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) { toast.error("Ungültiger oder nicht aktiver Gutschein."); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Dieser Gutschein ist abgelaufen."); return; }
      if ((data.use_count ?? 0) >= (data.max_uses ?? 1)) { toast.error("Dieser Gutschein wurde bereits vollständig verbraucht."); return; }

      const { data: existingRedemption, error: redemptionLookupError } = await supabase
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", data.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (redemptionLookupError) throw redemptionLookupError;
      if (existingRedemption) { toast.error("Sie haben diesen Gutschein bereits eingelöst."); return; }

      const { error: redemptionInsertError } = await supabase
        .from("coupon_redemptions")
        .insert({ coupon_id: data.id, user_id: user.id } as any);
      if (redemptionInsertError) throw redemptionInsertError;

      const nextUseCount = (data.use_count ?? 0) + 1;
      const nextMaxUses = data.max_uses ?? 1;
      const { error: updateError } = await supabase
        .from("coupons")
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
          use_count: nextUseCount,
          is_active: nextUseCount < nextMaxUses,
        } as any)
        .eq("id", data.id);
      if (updateError) throw updateError;

      toast.success(`Gutschein eingelöst! Verwendungen: ${nextUseCount}/${nextMaxUses}`);
      proceedWithAnalysis();
    } catch (err: any) {
      toast.error("Fehler", { description: err.message });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleVipPay = async () => {
    if (!user || !profile) return;
    if (profile.credits < VIP_COST) {
      setShowTopUpModal(true);
      return;
    }
    // Deduct credits
    const { error } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - VIP_COST } as any)
      .eq("user_id", user.id);
    if (error) { toast.error("Fehler beim Abbuchen."); return; }
    await refreshProfile();
    toast.success(`${VIP_COST.toFixed(2)} € vom Wallet abgezogen.`);
    proceedWithAnalysis();
  };

  const handleStandardPay = () => {
    // For now, proceed (beta). In production, redirect to Stripe checkout.
    toast.info("Beta-Phase: Generierung ist aktuell kostenlos.");
    proceedWithAnalysis();
  };

  const handleAnalysisComplete = useCallback(async (data: ExposeeData, images: string[], grundriss3dUrls?: string[]) => {
    setExposeeData(data);
    setImageUrls(images);
    setBildunterschriften((data as any).bildunterschriften || []);
    if (grundriss3dUrls && grundriss3dUrls.length > 0) setGrundriss3dUrls(grundriss3dUrls);
    setCurrentStep(2);

    // Increment total_exposes
    if (user) {
      const current = profile?.total_exposes || 0;
      await supabase
        .from("profiles")
        .update({ total_exposes: current + 1 } as any)
        .eq("user_id", user.id);
      refreshProfile();
    }
  }, [user, profile]);

  const handleAnalysisError = useCallback((error: string) => {
    toast.error("Analyse fehlgeschlagen", { description: error });
  }, []);

  const handleSave = (data: ExposeeData, updatedImages?: string[], updatedCaptions?: string[], blocks?: TextBlock[], wmText?: string, selectedGrundrisse?: string[]) => {
    setExposeeData(data);
    if (updatedImages) setImageUrls(updatedImages);
    if (updatedCaptions) setBildunterschriften(updatedCaptions);
    if (selectedGrundrisse) setGrundriss3dUrls(selectedGrundrisse);
    setExtraBlocks(blocks || []);
    setWatermarkText(wmText);
    setCurrentStep(3);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setFiles([]);
    setExposeeData(null);
    setImageUrls([]);
    setBildunterschriften([]);
    setGrundriss3dUrls([]);
    setCurrentExposeeId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">exposé.ai</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* VIP Wallet indicator */}
            {profile?.is_vip && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                <Wallet className="w-3.5 h-3.5" />
                {profile.credits.toFixed(2)} €
              </div>
            )}
            {(currentStep === 2 || currentStep === 3) && exposeeData && user && (
              <Button variant="outline" size="sm" onClick={handleSaveToAccount} disabled={saving} className="border-border">
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Speichern
              </Button>
            )}
            {currentStep === 3 && exposeeData && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="border-border">
                  <Pencil className="w-4 h-4 mr-1.5" />Zurück zum Editor
                </Button>
                <Button variant="outline" size="sm" onClick={() => previewRef.current?.exportPDF()} className="border-border">
                  <FileDown className="w-4 h-4 mr-1.5" />Als PDF exportieren
                </Button>
                <Button size="sm" onClick={handleReset} className="gradient-primary text-primary-foreground hover:opacity-90">
                  <RotateCcw className="w-4 h-4 mr-1.5" />Neues Exposé
                </Button>
              </>
            )}
            {currentStep === 2 && (
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(0)} className="border-border">
                <RotateCcw className="w-4 h-4 mr-1.5" />Neues Exposé
              </Button>
            )}
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/my-exposees")}>
                  <FolderOpen className="w-4 h-4 mr-1.5" />Meine Exposés
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-1.5" />Admin
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <User className="w-4 h-4 mr-1.5" />Anmelden
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-6 py-10">
        <div className="mb-12">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
              <div className="text-center max-w-lg mx-auto">
                <h1 className="text-3xl font-bold text-foreground mb-3">Neues Exposé erstellen</h1>
                <p className="text-muted-foreground text-lg mb-4">Werfen Sie alle Unterlagen in die Box – die KI erledigt den Rest.</p>
                <Button variant="outline" onClick={handleGenerateExample} disabled={generatingExample} className="border-primary/30 text-primary hover:bg-primary/5 h-10 px-5">
                  {generatingExample ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Beispiel wird erstellt…</> : <><Sparkles className="w-4 h-4 mr-2" />Beispiel-Exposé ansehen</>}
                </Button>
              </div>

              <UploadZone files={files} onFilesChange={setFiles} additionalNotes={additionalNotes} onAdditionalNotesChange={setAdditionalNotes} showGrundriss={has3dAccess} />

              {files.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <PriceCalculator files={files} />
                  <div className="flex justify-center">
                    <Button onClick={handleStartAnalysis} className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-12 px-8 text-base">
                      KI-Analyse starten
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <AnalysisLoader files={files} additionalNotes={additionalNotes} onComplete={handleAnalysisComplete} onError={handleAnalysisError} isAdmin={isAdmin} />
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setCurrentStep(0)}><ArrowLeft className="w-4 h-4 mr-2" />Zurück</Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="edit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center max-w-lg mx-auto mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Exposé bearbeiten</h2>
                <p className="text-muted-foreground">Die KI hat alle Felder vorausgefüllt. Passen Sie alles nach Ihren Wünschen an.</p>
              </div>
              <ExposeeForm onSave={handleSave} initialData={exposeeData || undefined} imageUrls={imageUrls} bildunterschriften={bildunterschriften} grundriss3dUrls={grundriss3dUrls} showGrundriss={has3dAccess} />
            </motion.div>
          )}

          {currentStep === 3 && exposeeData && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <div className="text-center max-w-lg mx-auto mb-8">
                <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Eye className="w-4 h-4" />Vorschau
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Ihr Exposé ist fertig!</h2>
                <p className="text-muted-foreground">So sieht Ihr Web-Exposé aus. Exportieren Sie es als PDF oder teilen Sie den Link.</p>
              </div>
              <ExposeePreview ref={previewRef} data={exposeeData} images={imageUrls} bildunterschriften={bildunterschriften} grundriss3dUrls={grundriss3dUrls} extraBlocks={extraBlocks} watermarkText={watermarkText} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ===== PAYWALL DIALOG ===== */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Exposé generieren
            </DialogTitle>
            <DialogDescription>
              Wählen Sie eine Zahlungsoption, um die KI-Analyse zu starten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Coupon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Gutscheincode einlösen</label>
              <div className="flex gap-2">
                <Input
                  placeholder="EXPO-XXXXXXXX"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                />
                <Button onClick={handleCouponRedeem} disabled={checkingCoupon || !couponCode.trim()} variant="outline">
                  {checkingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">oder</span></div>
            </div>

            {/* VIP Wallet */}
            {profile?.is_vip && (
              <Button onClick={handleVipPay} className="w-full" variant="outline">
                <Wallet className="w-4 h-4 mr-2" />
                Mit Wallet bezahlen ({VIP_COST.toFixed(2)} €)
                <span className="ml-auto text-xs text-muted-foreground">Guthaben: {profile.credits.toFixed(2)} €</span>
              </Button>
            )}

            {/* Standard */}
            <Button onClick={handleStandardPay} className="w-full gradient-primary text-primary-foreground hover:opacity-90">
              Zum Checkout ({profile?.is_vip ? "Standard-Preis" : "Weiter"})
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Aktuell kostenlos in der Beta-Phase.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== TOP-UP MODAL ===== */}
      <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Guthaben aufladen
            </DialogTitle>
            <DialogDescription>
              Ihr Wallet-Guthaben reicht nicht aus. Sie benötigen mindestens {VIP_COST.toFixed(2)} €.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{profile?.credits.toFixed(2) || "0.00"} €</p>
              <p className="text-sm text-muted-foreground">Aktuelles Guthaben</p>
            </div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={() => {
              toast.info("Stripe-Integration kommt bald. Beta-Phase: Guthaben wird vom Admin zugewiesen.");
              setShowTopUpModal(false);
            }}>
              <Wallet className="w-4 h-4 mr-2" />
              Guthaben aufladen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
