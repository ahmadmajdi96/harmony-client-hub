import { useState } from "react";
import { apiLogin } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import cortaLogo from "@/assets/corta-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiLogin(email, password);
      await refreshUser();
      navigate("/");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-violet-50 to-rose-50 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl shadow-primary/5 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img src={cortaLogo} alt="Cortanex AI Logo" className="w-20 h-20 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="mt-1">Sign in to CORTA-PM</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="pl-10 rounded-xl h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 rounded-xl h-11" required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 font-medium shadow-sm">
              {loading ? "Signing in..." : <><span>Sign In</span><ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            Powered by <span className="font-semibold text-muted-foreground/80">Cortanex AI</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
