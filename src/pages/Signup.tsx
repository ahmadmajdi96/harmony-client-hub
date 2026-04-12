import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, User } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "You can now sign in." });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-violet-50 to-rose-50 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl shadow-primary/5 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/15">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create account</CardTitle>
            <CardDescription className="mt-1">Join CORTA-PM</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className="pl-10 rounded-xl h-11" required />
              </div>
            </div>
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
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 rounded-xl h-11" required minLength={6} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 font-medium shadow-sm">
              {loading ? "Creating account..." : <><span>Create Account</span><ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
