import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import ReferenceGenerator from "@/components/references/ReferenceGenerator";
import ReferenceHistory from "@/components/references/ReferenceHistory";
import { Hash } from "lucide-react";

export default function DocumentReferences() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHeader
        title="Document References"
        subtitle="Generate and manage quotation & letter reference numbers"
      />
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <ReferenceGenerator onGenerated={() => setRefreshKey((k) => k + 1)} />
        <ReferenceHistory refreshKey={refreshKey} />
      </div>
    </div>
  );
}
