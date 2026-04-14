import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Pencil, Clock, Loader2, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

interface SavedExposee {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const MyExposees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exposees, setExposees] = useState<SavedExposee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExposees = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("exposees")
      .select("id, title, status, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden der Exposés");
    } else {
      setExposees(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExposees();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("exposees").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      setExposees((prev) => prev.filter((e) => e.id !== id));
      toast.success("Exposé gelöscht");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const { signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meine Exposés</h1>
          <p className="text-muted-foreground">{exposees.length} Exposé{exposees.length !== 1 ? "s" : ""} gespeichert</p>
        </div>
        <Button onClick={() => navigate("/dashboard")} className="gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4 mr-1.5" />
          Neues Exposé
        </Button>
      </div>

      {exposees.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="surface-elevated rounded-2xl p-12 text-center"
        >
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Exposés</h3>
          <p className="text-muted-foreground mb-6">Erstellen Sie Ihr erstes KI-Exposé.</p>
          <Button onClick={() => navigate("/dashboard")} className="gradient-primary text-primary-foreground hover:opacity-90">
            Jetzt starten
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {exposees.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="surface-elevated rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{exp.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>Zuletzt bearbeitet: {formatDate(exp.updated_at)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${exp.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {exp.status === "published" ? "Veröffentlicht" : "Entwurf"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard?edit=${exp.id}`)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(exp.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </main>
    </div>
  );
};

export default MyExposees;
