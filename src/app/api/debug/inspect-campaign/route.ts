import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
    try {
        // Get most recent campaign
        const campaignsRef = collection(db, 'quick_send_campaigns');
        const q = query(campaignsRef, orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No campaigns found' });
        }

        const campaign = snapshot.docs[0];
        const campaignId = campaign.id;
        const campaignData = campaign.data();

        // Get contacts
        const contactsRef = collection(db, 'quick_send_campaigns', campaignId, 'contacts');
        const contactsSnapshot = await getDocs(contactsRef);

        const contacts = contactsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            campaign: { id: campaignId, name: campaignData.name, createdAt: campaignData.createdAt },
            contacts
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
