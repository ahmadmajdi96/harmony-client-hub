import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      <Card className="w-full max-w-md relative z-10 border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-violet-200/60">Sign in to CORTA-PM</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-violet-100/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300/40" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-400/50" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-violet-100/80">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300/40" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-400/50" required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-medium shadow-lg shadow-violet-500/20 h-11">
              {loading ? "Signing in..." : <><span>Sign In</span><ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="text-center text-sm text-violet-200/40 mt-6">
            Don't have an account? <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
