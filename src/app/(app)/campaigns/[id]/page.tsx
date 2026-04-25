
import { notFound } from "next/navigation";
import { getCampaignById, getCampaignContacts } from "@/lib/actions";
import CampaignDetailClient from "./campaign-detail-client";

// SERVER COMPONENT (Default Export)
// This is an async Server Component responsible for fetching data.
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-destructive">ID de campanha inválido</p>
            </div>
        );
    }

    // Fetch data on the server in parallel
    const [campaign, contacts] = await Promise.all([
        getCampaignById(id),
        getCampaignContacts(id)
    ]);

    // If campaign doesn't exist, show 404
    if (!campaign) {
        notFound();
    }

    // Use the actual number of fetched contacts for the total stat if not provided by the API
    if (campaign.stats.total === 0) {
        campaign.stats.total = contacts.length;
    }

    // Pass server-fetched data to the Client Component
    return <CampaignDetailClient initialCampaign={campaign} initialContacts={contacts} />;
}
