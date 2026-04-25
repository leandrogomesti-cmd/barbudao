
import { NextResponse } from 'next/server';
import { getMissions, getFinancialClosings } from '@/lib/actions/dashboard';

export async function GET() {
    try {
        console.log("API Debug: Fetching missions...");
        const missions = await getMissions({ date: new Date() }, 50);

        console.log("API Debug: Fetching financials...");
        const financials = await getFinancialClosings({ date: new Date() }, 50);

        return NextResponse.json({
            count: missions.length,
            missions: missions,
            financialsCount: financials.length,
            financials: financials,
            serverTime: new Date().toISOString()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
