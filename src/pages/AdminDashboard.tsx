import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Ticket, Plus, Copy, Check, Clock, User, Loader2, Building2, LogOut,
  FolderOpen, Trash2, Users, Ban, Crown, Box, RotateCcw, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

interface Coupon {
  id: string;
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserRow {
  user_id: string;
  display_name: string | null;
  email?: string;
  created_at: string;
  last_online: string | null;
  total_exposes: number;
  total_paid: number;
  payment_plan: string;
  is_vip: boolean;
  is_blocked: boolean;
  has_3d_access: boolean;
  credits: number;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `EXPO-${code}`;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

const AdminDashboard = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState("30");

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redeemed coupons with user emails
  const [redeemedCoupons, setRedeemedCoupons] = useState<(Coupon & { redeemer_email?: string })[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    loadCoupons();
    loadUsers();
  }, [isAdmin]);

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      const all = (data as Coupon[]) || [];
      setCoupons(all);
      // Build redeemed list with user emails from profiles
      const redeemed = all.filter((c) => c.used_by);
      if (redeemed.length > 0) {
        const userIds = [...new Set(redeemed.map((c) => c.used_by!))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
        setRedeemedCoupons(redeemed.map((c) => ({ ...c, redeemer_email: profileMap.get(c.used_by!) || c.used_by! })));
      } else {
        setRedeemedCoupons([]);
      }
    }
    setLoadingCoupons(false);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, created_at, last_online, total_exposes, total_paid, payment_plan, is_vip, is_blocked, has_3d_access, credits")
      .order("created_at", { ascending: false });
    if (!error) setUsers((data as unknown as UserRow[]) || []);
    setLoadingUsers(false);
  };

  const createCoupon = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const code = generateCode();
      const days = parseInt(expiryDays) || 30;
      const expires_at = new Date(Date.now() + days * 86400000).toISOString();
      const { error } = await supabase.from("coupons").insert({ code, created_by: user.id, expires_at } as any);
      if (error) throw error;
      toast.success(`Gutschein erstellt: ${code}`);
      loadCoupons();
    } catch (err: any) {
      toast.error("Fehler", { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error("Löschen fehlgeschlagen");
    else {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Gutschein gelöscht");
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Admin actions on users
  const toggleField = async (userId: string, field: "is_vip" | "is_blocked" | "has_3d_access", current: boolean) => {
    setActionLoading(`${userId}-${field}`);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: !current } as any)
      .eq("user_id", userId);
    if (error) toast.error("Fehler: " + error.message);
    else {
      toast.success("Aktualisiert");
      loadUsers();
    }
    setActionLoading(null);
  };

  const sendPasswordReset = async (email: string) => {
    setActionLoading(`reset-${email}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error("Fehler: " + error.message);
    else toast.success(`Passwort-Reset E-Mail an ${email} gesendet.`);
    setActionLoading(null);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Kein Zugriff</h2>
          <p className="text-muted-foreground">Diese Seite ist nur für Administratoren.</p>
          <Button onClick={() => navigate("/")} variant="outline">Zurück zur Startseite</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">exposé.ai</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <Plus className="w-4 h-4 mr-1.5" />Neues Exposé
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/my-exposees")}>
              <FolderOpen className="w-4 h-4 mr-1.5" />Meine Exposés
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Nutzer verwalten, Gutscheine erstellen und Nutzung einsehen.</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />Nutzer
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-1.5">
              <Ticket className="w-4 h-4" />Gutscheine
            </TabsTrigger>
            <TabsTrigger value="redeemed" className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />Eingelöst
            </TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="space-y-4">
            {loadingUsers ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : users.length === 0 ? (
              <div className="surface-elevated rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Noch keine Nutzer registriert.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-3 font-medium">Nutzer</th>
                      <th className="py-3 px-3 font-medium">Registriert</th>
                      <th className="py-3 px-3 font-medium">Zuletzt online</th>
                      <th className="py-3 px-3 font-medium text-center">Exposés</th>
                      <th className="py-3 px-3 font-medium text-right">Bezahlt</th>
                      <th className="py-3 px-3 font-medium">Plan</th>
                      <th className="py-3 px-3 font-medium text-center">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{u.display_name || "–"}</span>
                              <div className="flex gap-1 mt-0.5">
                                {u.is_vip && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">VIP</span>}
                                {u.is_blocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">Gesperrt</span>}
                                {u.has_3d_access && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">3D</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatDate(u.last_online)}</td>
                        <td className="py-3 px-3 text-center text-foreground font-medium">{u.total_exposes}</td>
                        <td className="py-3 px-3 text-right text-foreground">{u.total_paid.toFixed(2)} €</td>
                        <td className="py-3 px-3 text-muted-foreground">{u.payment_plan}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 justify-center flex-wrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Passwort-Reset"
                              disabled={actionLoading === `reset-${u.display_name}`}
                              onClick={() => sendPasswordReset(u.display_name || "")}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${u.is_blocked ? "text-red-500" : ""}`}
                              title={u.is_blocked ? "Entsperren" : "Sperren"}
                              disabled={actionLoading === `${u.user_id}-is_blocked`}
                              onClick={() => toggleField(u.user_id, "is_blocked", u.is_blocked)}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${u.is_vip ? "text-yellow-500" : ""}`}
                              title={u.is_vip ? "VIP entfernen" : "VIP vergeben"}
                              disabled={actionLoading === `${u.user_id}-is_vip`}
                              onClick={() => toggleField(u.user_id, "is_vip", u.is_vip)}
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${u.has_3d_access ? "text-blue-500" : ""}`}
                              title={u.has_3d_access ? "3D deaktivieren" : "3D freischalten"}
                              disabled={actionLoading === `${u.user_id}-has_3d_access`}
                              onClick={() => toggleField(u.user_id, "has_3d_access", u.has_3d_access)}
                            >
                              <Box className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ===== COUPONS TAB ===== */}
          <TabsContent value="coupons" className="space-y-6">
            <div className="surface-elevated rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Neuen Gutschein erstellen
              </h2>
              <div className="flex items-end gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Gültigkeit (Tage)</label>
                  <Input type="number" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="w-32" min="1" max="365" />
                </div>
                <Button onClick={createCoupon} disabled={creating} className="gradient-primary text-primary-foreground hover:opacity-90">
                  {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Gutschein generieren
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Alle Gutscheine ({coupons.length})</h2>
              {loadingCoupons ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : coupons.length === 0 ? (
                <div className="surface-elevated rounded-2xl p-12 text-center">
                  <Ticket className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Noch keine Gutscheine erstellt.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {coupons.map((coupon, i) => {
                    const isUsed = !!coupon.used_by;
                    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                    const status = isUsed ? "used" : isExpired ? "expired" : "active";
                    return (
                      <motion.div key={coupon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="surface-elevated rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === "used" ? "bg-green-100 dark:bg-green-900/30" : status === "expired" ? "bg-muted" : "bg-primary/10"}`}>
                            <Ticket className={`w-5 h-5 ${status === "used" ? "text-green-600 dark:text-green-400" : status === "expired" ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground tracking-wider">{coupon.code}</span>
                              <button onClick={() => copyCode(coupon.id, coupon.code)} className="p-1 rounded hover:bg-accent transition-colors">
                                {copiedId === coupon.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                              </button>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === "used" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : status === "expired" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                                {status === "used" ? "Eingelöst" : status === "expired" ? "Abgelaufen" : "Aktiv"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Erstellt: {formatDate(coupon.created_at)}</span>
                              {coupon.expires_at && <span>Gültig bis: {formatDate(coupon.expires_at)}</span>}
                              {isUsed && coupon.used_at && <span className="flex items-center gap-1"><User className="w-3 h-3" />Eingelöst: {formatDate(coupon.used_at)}</span>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteCoupon(coupon.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== REDEEMED TAB ===== */}
          <TabsContent value="redeemed" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Eingelöste Gutscheine ({redeemedCoupons.length})</h2>
            {redeemedCoupons.length === 0 ? (
              <div className="surface-elevated rounded-2xl p-12 text-center">
                <Check className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Noch keine Gutscheine eingelöst.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 px-3 font-medium">Code</th>
                      <th className="py-3 px-3 font-medium">Eingelöst von</th>
                      <th className="py-3 px-3 font-medium">Zeitstempel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redeemedCoupons.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-3 px-3 font-mono font-bold text-foreground">{c.code}</td>
                        <td className="py-3 px-3 text-foreground">{c.redeemer_email}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatDate(c.used_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
