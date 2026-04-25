
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, updateDoc, Timestamp, doc } from 'firebase/firestore';
import { runCampaignWorker } from '@/ai/flows/run-campaign-worker';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const campaignsRef = collection(db, 'quick_send_campaigns');
        // Find campaigns that are waiting for schedule
        const q = query(campaignsRef, where('status', '==', 'waiting_schedule'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No campaigns waiting for schedule.' });
        }

        const maxCampaignsToResume = 5; // Batch limit to avoid timeouts
        let resumedCount = 0;

        for (const campaignDoc of snapshot.docs) {
            if (resumedCount >= maxCampaignsToResume) break;

            const data = campaignDoc.data();
            const scheduling = data.scheduling;

            if (scheduling && scheduling.enabled) {
                const now = new Date();
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                const offset = -3; // UTC-3 (Brasília)
                const brazilTime = new Date(utc + (3600000 * offset));

                const currentDay = brazilTime.getDay(); // 0-6
                const currentHour = brazilTime.getHours();
                const currentMinute = brazilTime.getMinutes();
                const currentTimeVal = currentHour * 60 + currentMinute;

                const [startH, startM] = scheduling.startTime.split(':').map(Number);
                const [endH, endM] = scheduling.endTime.split(':').map(Number);
                const startTimeVal = startH * 60 + startM;
                const endTimeVal = endH * 60 + endM;

                const isDayValid = scheduling.daysOfWeek.includes(currentDay);
                const isTimeValid = currentTimeVal >= startTimeVal && currentTimeVal < endTimeVal;

                if (isDayValid && isTimeValid) {

                    // --- DAILY RECURRENCE CHECK ---
                    if (data.last_finished_at) {
                        const lastFinishedDate = new Date(data.last_finished_at);
                        // Check if it finished TODAY (in Brasilia time, roughly)
                        // Simple check: same ISO date string (YYYY-MM-DD) comparing UTC-3 or just allow 12h buffer
                        // Let's be robust:
                        const nowBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        const lastFinishedBrasilia = new Date(lastFinishedDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

                        const isSameDay = nowBrasilia.getDate() === lastFinishedBrasilia.getDate() &&
                            nowBrasilia.getMonth() === lastFinishedBrasilia.getMonth() &&
                            nowBrasilia.getFullYear() === lastFinishedBrasilia.getFullYear();

                        if (isSameDay) {
                            console.log(`Campaign ${campaignDoc.id} already finished today (${data.last_finished_at}). Skipping.`);
                            continue;
                        }
                    }
                    // ------------------------------

                    console.log(`Resuming campaign ${campaignDoc.id} (Schedule match)`);
                    // Set status back to 'running'
                    await updateDoc(doc(db, 'quick_send_campaigns', campaignDoc.id), {
                        status: 'starting', // 'starting' triggers the worker logic if we were using a listener, but here we call manually
                        updated_at: Timestamp.now(),
                        // Reset stats for the new daily run
                        'stats.processed': 0,
                        'stats.sent': 0,
                        'stats.delivered': 0,
                        'stats.failed': 0
                    });

                    // Call the worker
                    runCampaignWorker(campaignDoc.id);
                    resumedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Checked ${snapshot.size} campaigns. Resumed ${resumedCount}.`
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
