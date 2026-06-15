import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received Vapi Webhook event:", body);

    const message = body.message;
    if (!message) {
      return NextResponse.json({ message: "No message payload" }, { status: 400 });
    }

    const eventType = message.type;
    const callData = message.call;
    const metadata = message.metadata || {};

    if (eventType === 'end-of-call-report' && callData) {
      const vapiCallId = callData.id;
      const duration = callData.duration ? Math.round(Number(callData.duration)) : 0;
      const recordingUrl = callData.recordingUrl || '';
      const summary = callData.summary || '';
      const transcript = callData.transcript || '';
      const callLogId = metadata.call_log_id || '';
      
      // Map Vapi end status/reason to call logs status
      let finalStatus = 'completed';
      if (callData.endedReason === 'customer-busy' || callData.endedReason === 'busy') {
        finalStatus = 'busy';
      } else if (callData.endedReason === 'no-answer') {
        finalStatus = 'no-answer';
      } else if (callData.endedReason === 'failed' || callData.endedReason === 'error') {
        finalStatus = 'failed';
      }

      console.log(`Processing call end: LogID: ${callLogId}, VapiID: ${vapiCallId}, Status: ${finalStatus}`);

      // We run direct SQL update bypassing RLS since it's a secure backend webhook
      const query = `
        UPDATE public.call_logs
        SET status = $1, duration = $2, recording_url = $3, summary = $4, transcript = $5, updated_at = NOW()
        WHERE id = $6 OR vapi_call_id = $7
        RETURNING id;
      `;

      const values = [finalStatus, duration, recordingUrl, summary, transcript, callLogId || null, vapiCallId || null];
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        console.warn(`No matching call log found for CallLogID: ${callLogId} or VapiCallID: ${vapiCallId}`);
        return NextResponse.json({ message: "Call log not found" }, { status: 404 });
      }

      // If campaign exists, check if all call logs for this campaign are finished, and update campaign status
      if (metadata.campaign_id) {
        const campaignId = metadata.campaign_id;
        const checkQuery = `
          SELECT status FROM public.call_logs
          WHERE campaign_id = $1;
        `;
        const checkResult = await pool.query(checkQuery, [campaignId]);
        const statuses = checkResult.rows.map(r => r.status);
        
        // If no call logs are left pending or calling, set campaign status to completed
        const isCampaignDone = !statuses.includes('pending') && !statuses.includes('calling');
        if (isCampaignDone) {
          await pool.query(
            `UPDATE public.campaigns SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [campaignId]
          );
        }
      }

      return NextResponse.json({ message: "Call log updated successfully", id: result.rows[0].id });
    }

    return NextResponse.json({ message: "Event ignored" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message || "Webhook error" }, { status: 500 });
  }
}
