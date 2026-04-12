import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="text-8xl font-bold text-primary/20">404</div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
          <Button asChild>
            <Link to="/"><Home className="h-4 w-4 mr-2" /> Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
