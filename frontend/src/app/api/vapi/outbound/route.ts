import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_846718b86955d3fece95d9ae0d840866').replace(/^"|"$/g, '');
const VAPI_API_KEY = (process.env.VAPI_API_KEY || 'dummy_vapi_key').replace(/^"|"$/g, '');
const VAPI_PHONE_NUMBER_ID = (process.env.VAPI_PHONE_NUMBER_ID || '').replace(/^"|"$/g, '');

/**
 * Normalize any phone number string to E.164 format (+XXXXXXXXXXX).
 * Strips all non-digit chars, then prepends '+1' for 10-digit numbers
 * or '+' for international numbers that already have a country code.
 */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;        // US/CA default
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;           // International
  return `+${digits}`;                                   // Best-effort
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
      console.error('Server auth check failed. authError:', authError, 'data:', data);
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
      const { count } = await userInsforge
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count !== null && count >= 3) {
        return NextResponse.json({
          detail: 'Free tier limit reached. You can make at most 3 calls on the Free plan. Please upgrade to Pro in Settings for unlimited calling!'
        }, { status: 403 });
      }
    }

    // ── Input ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { phone, name, prompt, voiceId, campaignId, contactId, simulate, language } = body as {
      phone: string;
      name?: string;
      prompt?: string;
      voiceId?: string;
      campaignId?: string;
      contactId?: string;
      simulate?: boolean;
      language?: string;
    };

    if (!phone) {
      return NextResponse.json({ detail: '`phone` is required' }, { status: 400 });
    }

    const e164Phone = toE164(phone);
    const contactName = name || 'Contact';
    const systemPrompt = prompt || 'You are a helpful assistant making an outbound call. Be brief and professional.';
    const voice = voiceId || 'jennifer'; // 11labs default

    // ── Create call log (pending) ─────────────────────────────────────
    const { data: callLog, error: logError } = await userInsforge
      .from('call_logs')
      .insert([{
        campaign_id: campaignId || null,
        contact_id: contactId || null,
        contact_name: contactName,
        contact_phone: e164Phone,
        status: 'pending',
        duration: 0,
        user_id: user.id,
      }])
      .select()
      .single();

    if (logError || !callLog) {
      console.error('Failed to create call log:', logError);
      return NextResponse.json({ detail: 'Failed to create call log' }, { status: 500 });
    }

    // ── Simulation mode (explicitly requested or no real Vapi key) ───
    if (simulate || VAPI_API_KEY === 'dummy_vapi_key' || !VAPI_API_KEY) {
      const simId = `sim_${Math.random().toString(36).substring(2, 11)}`;
      await userInsforge
        .from('call_logs')
        .update({ status: 'calling', vapi_call_id: simId })
        .eq('id', callLog.id);

      return NextResponse.json({
        callId: simId,
        callLogId: callLog.id,
        status: 'calling',
        mode: 'simulation',
        message: 'Simulation mode — set a real VAPI_API_KEY to place live calls',
      });
    }

    // ── Real Vapi outbound call ───────────────────────────────────────
    const vapiPayload: Record<string, unknown> = {
      assistant: {
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: language || 'en',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.7,
        },
        voice: {
          provider: '11labs',
          voiceId: voice,
        },
        firstMessage: `Hello ${contactName}, this is an automated call from VoiceFlow AI. How can I help you today?`,
      },
      customer: {
        number: e164Phone,
        name: contactName,
      },
      metadata: {
        contact_id: contactId || null,
        campaign_id: campaignId || null,
        call_log_id: callLog.id,
        user_id: user.id,
      },
    };

    // phoneNumberId is required for outbound — if not set, Vapi returns 400
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
      console.error('Vapi API error:', errText);
      // Mark call log as failed
      await userInsforge
        .from('call_logs')
        .update({ status: 'failed', summary: `Vapi error: ${errText}` })
        .eq('id', callLog.id);
      return NextResponse.json(
        { detail: `Vapi API error: ${errText}` },
        { status: vapiRes.status }
      );
    }

    const vapiData = await vapiRes.json();

    // Update call log with real vapi call id
    await userInsforge
      .from('call_logs')
      .update({ status: 'calling', vapi_call_id: vapiData.id })
      .eq('id', callLog.id);

    return NextResponse.json({
      callId: vapiData.id,
      callLogId: callLog.id,
      status: 'calling',
      mode: 'live',
    });
  } catch (error: any) {
    console.error('Outbound call error:', error);
    return NextResponse.json({ detail: error.message || 'Internal server error' }, { status: 500 });
  }
}
