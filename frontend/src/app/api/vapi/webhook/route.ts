import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

// Use a server-side InsForge client with the anon key — RLS will allow
// updates because we match on vapi_call_id which is stored in the row.
// For webhook updates we use the service key if available, else anon key.
const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const INSFORGE_KEY = (
  process.env.INSFORGE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  'ik_846718b86955d3fece95d9ae0d840866'
).replace(/^"|"$/g, '');

function getInsforge() {
  return createClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Vapi webhook received:', JSON.stringify(body).slice(0, 500));

    // Vapi sends events with a top-level `message` wrapper
    const message = body.message || body;
    const eventType = message.type || body.type;
    const callData = message.call || body.call;
    const metadata = message.call?.metadata || body.metadata || {};

    if (!eventType) {
      return NextResponse.json({ message: 'No event type' }, { status: 200 });
    }

    if (eventType === 'end-of-call-report' && callData) {
      const vapiCallId: string = callData.id || '';
      const callLogId: string = metadata.call_log_id || '';
      const campaignId: string = metadata.campaign_id || '';

      const duration = callData.duration ? Math.round(Number(callData.duration)) : 0;
      const recordingUrl: string = callData.recordingUrl || callData.recording_url || '';
      const summary: string = callData.summary || message.summary || '';
      const transcript: string = callData.transcript || message.transcript || '';

      // Map Vapi endedReason → our status
      let finalStatus = 'completed';
      const endedReason: string = callData.endedReason || callData.ended_reason || '';
      if (endedReason === 'customer-busy' || endedReason === 'busy') {
        finalStatus = 'busy';
      } else if (endedReason === 'no-answer' || endedReason === 'no-answer-machine') {
        finalStatus = 'no-answer';
      } else if (
        endedReason === 'failed' ||
        endedReason === 'error' ||
        endedReason === 'pipeline-error' ||
        endedReason === 'voicemail'
      ) {
        finalStatus = 'failed';
      }

      console.log(`End-of-call: LogID=${callLogId}, VapiID=${vapiCallId}, Status=${finalStatus}`);

      const db = getInsforge();

      // Update call log by call_log_id (preferred) or vapi_call_id
      if (callLogId) {
        const { error } = await db
          .from('call_logs')
          .update({ status: finalStatus, duration, recording_url: recordingUrl, summary, transcript })
          .eq('id', callLogId);
        if (error) console.error('Failed to update call log by id:', error);
      } else if (vapiCallId) {
        const { error } = await db
          .from('call_logs')
          .update({ status: finalStatus, duration, recording_url: recordingUrl, summary, transcript })
          .eq('vapi_call_id', vapiCallId);
        if (error) console.error('Failed to update call log by vapi_call_id:', error);
      }

      // Check if the whole campaign is done
      if (campaignId) {
        const { data: campaignLogs } = await db
          .from('call_logs')
          .select('status')
          .eq('campaign_id', campaignId);

        const statuses = (campaignLogs || []).map((r: any) => r.status);
        const allDone = !statuses.includes('pending') && !statuses.includes('calling');
        if (allDone) {
          await db
            .from('campaigns')
            .update({ status: 'completed' })
            .eq('id', campaignId);
          console.log(`Campaign ${campaignId} marked completed`);
        }
      }

      return NextResponse.json({ message: 'Call log updated', status: finalStatus });
    }

    // Handle status-update events (optional — keeps call log in sync during call)
    if ((eventType === 'status-update' || eventType === 'call-update') && callData) {
      const vapiCallId: string = callData.id || '';
      const callLogId: string = metadata.call_log_id || callData?.metadata?.call_log_id || '';
      const callStatus: string = callData.status || '';

      if (vapiCallId && callStatus) {
        const db = getInsforge();
        const updateTarget = callLogId
          ? db.from('call_logs').update({ status: 'calling' }).eq('id', callLogId)
          : db.from('call_logs').update({ status: 'calling' }).eq('vapi_call_id', vapiCallId);
        await updateTarget;
      }
    }

    return NextResponse.json({ message: 'Event processed' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Webhook error' }, { status: 500 });
  }
}
