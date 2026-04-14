import { motion } from "framer-motion";
import { Building2, ArrowRight, Sparkles, Upload, Eye, Shield, Check, Ticket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

const features = [
  {
    icon: Upload,
    title: "Alles reinwerfen",
    description: "PDFs, Fotos, Grundrisse und Notizen – unsortiert hochladen. Die KI sortiert und versteht alles automatisch.",
  },
  {
    icon: Sparkles,
    title: "KI generiert",
    description: "In Sekunden entsteht ein professionelles, emotional geschriebenes Immobilien-Exposé mit 3D-Grundrissen.",
  },
  {
    icon: Eye,
    title: "Prüfen & exportieren",
    description: "Im Editor anpassen, Vorschau prüfen und als hochwertiges PDF exportieren. Fertig.",
  },
];

const stats = [
  { value: "< 60s", label: "Generierungszeit" },
  { value: "90%", label: "Sofort fertig" },
  { value: "PDF", label: "Export-Format" },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "5",
    unit: "pro Exposé",
    description: "Ideal zum Ausprobieren",
    features: [
      "KI-Analyse & Textgenerierung",
      "Bis zu 10 Fotos",
      "PDF-Export",
      "Exposé-Editor",
      "Unbegrenztes Bearbeiten",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    price: "9",
    unit: "pro Exposé",
    description: "Für anspruchsvolle Makler",
    features: [
      "Alles aus Starter",
      "Unbegrenzte Fotos",
      "3D-Grundriss-Generierung",
      "Premium-Designvorlagen",
      "Wasserzeichen anpassbar",
      "Prioritäts-Support",
    ],
    highlight: true,
  },
  {
    name: "Agentur",
    price: "49",
    unit: "/ Monat",
    description: "Unbegrenzte Exposés für Teams",
    features: [
      "Alles aus Professional",
      "Unbegrenzte Exposés",
      "Team-Zugang (bis 5 Nutzer)",
      "Eigenes Branding & Logo",
      "API-Zugang",
      "Dedizierter Support",
    ],
    highlight: false,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">exposé.ai</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/my-exposees")}>Meine Exposés</Button>
                <Button onClick={() => navigate("/dashboard")} className="gradient-primary text-primary-foreground hover:opacity-90">Neues Exposé</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Einloggen</Button>
                <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground hover:opacity-90">Kostenlos starten</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="container max-w-6xl mx-auto px-6 py-28 md:py-40 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl mx-auto space-y-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }} className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-full text-sm font-medium border border-border">
              <Sparkles className="w-4 h-4" />
              KI-gestützte Exposé-Erstellung
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight">
              Exposés erstellen,<br />
              <span className="text-primary">nicht tippen.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Fotos, PDFs und Notizen hochladen – unsere KI generiert in Sekunden ein professionelles Immobilien-Exposé.
            </p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleCTA} className="gradient-primary text-primary-foreground hover:opacity-90 transition-opacity h-14 px-10 text-lg rounded-xl">
                Jetzt Exposé erstellen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="h-14 px-8 text-lg rounded-xl border-border">
                Demo ansehen
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-6xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">So einfach geht's</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Drei Schritte zum perfekten Exposé – ohne Vorlagen, ohne Formatierung.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.15 }} className="surface-elevated rounded-2xl p-8 text-center space-y-5 group hover:shadow-elevated transition-shadow">
                <div className="relative mx-auto w-16 h-16">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center border-2 border-background">{i + 1}</div>
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border bg-card/50">
        <div className="container max-w-6xl mx-auto px-6 py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Preise</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Transparent und fair – zahlen Sie nur, was Sie nutzen.</p>
            <div className="inline-flex items-center gap-2 mt-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium">
              <Ticket className="w-4 h-4" />
              Gutscheincode? Beim Erstellen einlösen!
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`rounded-2xl p-8 space-y-6 relative ${
                  plan.highlight
                    ? "surface-elevated ring-2 ring-primary shadow-elevated"
                    : "surface-elevated"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    Beliebteste Wahl
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price} €</span>
                  <span className="text-muted-foreground text-sm">{plan.unit}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleCTA}
                  className={`w-full h-12 ${
                    plan.highlight
                      ? "gradient-primary text-primary-foreground hover:opacity-90"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  Jetzt starten
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Aktuell kostenlos in der Beta-Phase. Preise gelten ab dem offiziellen Launch.
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border">
        <div className="container max-w-6xl mx-auto px-6 py-20">
          <div className="surface-elevated rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2">Sicher & vertraulich</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ihre Daten bleiben geschützt. Alle Exposés werden verschlüsselt gespeichert und sind nur für Sie zugänglich. DSGVO-konform und in Europa gehostet.
              </p>
            </div>
            <Button onClick={handleCTA} className="gradient-primary text-primary-foreground hover:opacity-90 h-12 px-8 flex-shrink-0">
              Jetzt starten
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 exposé.ai – KI-Exposé-Generator für Immobilienmakler
        </div>
      </footer>
    </div>
  );
};

export default Index;
