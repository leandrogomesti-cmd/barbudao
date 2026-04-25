import { getInstances } from "@/lib/actions";
import InstancesClient from "./instances-client";


export default async function InstancesPage() {
  // O getInstances agora busca o status real do Chatwoot
  const initialInstances = await getInstances("current-user");

  return (
    <div className="container mx-auto py-8">
      <InstancesClient initialInstances={initialInstances} />
    </div>
  );
}
