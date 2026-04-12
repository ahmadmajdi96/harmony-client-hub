import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Application configuration and preferences" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">General Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <span>Application Name</span>
                <span className="font-medium text-foreground">HarmonyHub</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <span>Version</span>
                <span className="font-medium text-foreground">1.0.0</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <span>Backend</span>
                <span className="font-medium text-foreground">Lovable Cloud</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <span>File Storage</span>
                <span className="font-medium text-foreground">Cloud Storage (project-files bucket)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              HarmonyHub is a comprehensive project and client management system. It provides tools for managing projects, clients, tasks, file uploads, and reporting — all backed by a cloud database and storage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
