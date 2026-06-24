import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_846718b86955d3fece95d9ae0d840866').replace(/^"|"$/g, '');
const VAPI_API_KEY = (process.env.VAPI_API_KEY || 'dummy_vapi_key').replace(/^"|"$/g, '');
const VAPI_PHONE_NUMBER_ID = (process.env.VAPI_PHONE_NUMBER_ID || '').replace(/^"|"$/g, '');

/**
 * Normalize any phone number string to E.164 format (+XXXXXXXXXXX).
 */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export async function POST(req: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ detail: 'Missing Authorization header' }, { status: 401 });
    }
    const token = authHeader.replace(/^[Bb]earer\s+/, '').trim().replace(/^"|"$/g, '');

    const userInsforge = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: INSFORGE_KEY,
      isServerMode: true,
    });
    userInsforge.setAccessToken(token);

    const { data, error: authError } = await userInsforge.auth.getCurrentUser();
    if (authError || !data?.user) {
      console.error('Server campaign call auth check failed. authError:', authError, 'data:', data);
      const errMsg = authError?.message || (authError as any)?.error || 'Session invalid or user not found';
      
      const debugInfo = {
        url: INSFORGE_URL,
        keyPrefix: INSFORGE_KEY ? `${INSFORGE_KEY.substring(0, 8)}...` : 'none',
        tokenLen: token ? token.length : 0,
        tokenPrefix: token ? `${token.substring(0, 15)}...${token.substring(token.length - 10)}` : 'none',
      };
      
      return NextResponse.json({ 
        detail: `Unauthorized: ${errMsg} (URL: ${debugInfo.url}, Key: ${debugInfo.keyPrefix}, TokenLen: ${debugInfo.tokenLen}, Token: ${debugInfo.tokenPrefix})` 
      }, { status: 401 });
    }
    const user = data.user;

    // ── Plan Quota Check ──────────────────────────────────────────────
    const { data: profile } = await userInsforge
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    const plan = profile?.plan || 'free';

    if (plan === 'free') {
      return NextResponse.json({
        detail: 'Campaign dialing is a Premium feature. Please upgrade to Pro in Settings to dial campaigns!'
      }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────
    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ detail: 'campaignId is required' }, { status: 400 });
    }

    // ── Vapi credential validation ────────────────────────────────────
    if (VAPI_API_KEY === 'dummy_vapi_key' || !VAPI_API_KEY) {
      return NextResponse.json({
        detail: 'Vapi API key is not configured. Please set a valid VAPI_API_KEY in frontend/.env.local.'
      }, { status: 400 });
    }

    if (!VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json({
        detail: 'Vapi Phone Number ID is not configured. Please set your VAPI_PHONE_NUMBER_ID in frontend/.env.local.'
      }, { status: 400 });
    }

    // ── Fetch campaign with agent config ─────────────────────────────
    const { data: campaign, error: campaignError } = await userInsforge
      .from('campaigns')
      .select('*, voice_agent_configurations(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ detail: 'Campaign not found' }, { status: 404 });
    }

    // ── Fetch contacts for this campaign ─────────────────────────────
    const { data: campaignContacts, error: contactsError } = await userInsforge
      .from('campaign_contacts')
      .select('contacts(*)')
      .eq('campaign_id', campaignId);

    if (contactsError) {
      return NextResponse.json({ detail: 'Failed to retrieve campaign contacts' }, { status: 500 });
    }

    const contacts = (campaignContacts || []).map((c: any) => c.contacts).filter(Boolean);
    if (contacts.length === 0) {
      return NextResponse.json({ detail: 'No contacts assigned to this campaign' }, { status: 400 });
    }

    // ── Mark campaign active ──────────────────────────────────────────
    await userInsforge.from('campaigns').update({ status: 'active' }).eq('id', campaignId);

    const agentConfig = campaign.voice_agent_configurations;
    const systemPrompt = agentConfig?.prompt || 'You are a helpful assistant making an outbound call.';
    const voiceId = agentConfig?.voice_id || 'jennifer';
    const temperature = Number(agentConfig?.temperature ?? 0.7);
    const agentLanguage = agentConfig?.language || 'en';
    const agentName = agentConfig?.name || 'VoiceFlow AI';

    // ── Trigger calls for each contact ───────────────────────────────
    const results = await Promise.allSettled(
      contacts.map(async (contact: any) => {
        const e164Phone = toE164(contact.phone || '');

        // Create call log
        const { data: callLog, error: logError } = await userInsforge
          .from('call_logs')
          .insert([{
            campaign_id: campaignId,
            contact_id: contact.id,
            contact_name: contact.name,
            contact_phone: e164Phone,
            status: 'pending',
            duration: 0,
            user_id: user.id,
          }])
          .select()
          .single();

        if (logError || !callLog) {
          console.error(`Failed to create call log for contact ${contact.id}:`, logError);
          return;
        }


        // ── Real Vapi call ───────────────────────────────────────────
        try {
          const vapiPayload: Record<string, unknown> = {
            assistant: {
              recordingEnabled: true,
              transcriber: {
                provider: 'deepgram',
                model: 'nova-2',
                language: agentLanguage,
              },
              model: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: systemPrompt }],
                temperature,
              },
              voice: {
                provider: '11labs',
                voiceId,
              },
              firstMessage: `Hello ${contact.name}, this is ${agentName} calling.`,
            },
            customer: {
              number: e164Phone,
              name: contact.name,
            },
            metadata: {
              contact_id: contact.id,
              campaign_id: campaignId,
              call_log_id: callLog.id,
              user_id: user.id,
            },
          };

          // phoneNumberId is required for outbound dialing
          if (VAPI_PHONE_NUMBER_ID) {
            vapiPayload.phoneNumberId = VAPI_PHONE_NUMBER_ID;
          }

          const vapiRes = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(vapiPayload),
          });

          if (!vapiRes.ok) {
            const errText = await vapiRes.text();
            throw new Error(errText);
          }

          const vapiData = await vapiRes.json();
          await userInsforge
            .from('call_logs')
            .update({ status: 'calling', vapi_call_id: vapiData.id })
            .eq('id', callLog.id);
        } catch (err: any) {
          console.error(`Vapi call failed for contact ${contact.id}:`, err);
          
          let friendlyError = err.message;
          try {
            const parsed = JSON.parse(err.message);
            if (parsed.message) {
              friendlyError = parsed.message;
              if (parsed.message.includes('Free Vapi numbers do not support international calls')) {
                friendlyError = "Free Vapi numbers do not support international calls. Please configure a custom carrier or upgrade in the Vapi Dashboard.";
              }
            }
          } catch (_) {}

          await userInsforge
            .from('call_logs')
            .update({ status: 'failed', summary: `Error: ${friendlyError}` })
            .eq('id', callLog.id);
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Campaign calls triggered',
      total: contacts.length,
      failed,
      mode: 'live',
    });
  } catch (error: any) {
    console.error('Campaign call route error:', error);
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}
