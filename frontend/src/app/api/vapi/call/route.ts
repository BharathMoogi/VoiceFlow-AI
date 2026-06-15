import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');
const VAPI_API_KEY = (process.env.VAPI_API_KEY || "dummy_vapi_key").replace(/^"|"$/g, '');

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ detail: "Missing Authorization header" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create an authenticated InsForge client using the user's JWT
    const userInsforge = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: INSFORGE_KEY,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Verify authentication
    const { data, error: authError } = await userInsforge.auth.getCurrentUser();
    if (authError || !data || !data.user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    const user = data.user;

    const { campaignId } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ detail: "campaignId is required" }, { status: 400 });
    }

    // 1. Fetch Campaign details
    const { data: campaign, error: campaignError } = await userInsforge
      .from('campaigns')
      .select('*, voice_agent_configurations(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ detail: "Campaign not found" }, { status: 404 });
    }

    // 2. Fetch Contacts in the campaign
    const { data: campaignContacts, error: contactsError } = await userInsforge
      .from('campaign_contacts')
      .select('contacts(*)')
      .eq('campaign_id', campaignId);

    if (contactsError) {
      return NextResponse.json({ detail: "Failed to retrieve campaign contacts" }, { status: 500 });
    }

    const contacts = (campaignContacts || []).map((c: any) => c.contacts).filter(Boolean);
    if (contacts.length === 0) {
      return NextResponse.json({ detail: "No contacts assigned to this campaign" }, { status: 400 });
    }

    // Update campaign status to active
    await userInsforge.from('campaigns').update({ status: 'active' }).eq('id', campaignId);

    const agentConfig = campaign.voice_agent_configurations;
    const voiceId = agentConfig?.voice_id || 'josh';
    const systemPrompt = agentConfig?.prompt || 'You are a helpful assistant.';
    const temperature = agentConfig?.temperature || 0.7;

    // 3. Trigger call for each contact
    const triggerPromises = contacts.map(async (contact: any) => {
      // Create Call Log
      const { data: callLog, error: logError } = await userInsforge
        .from('call_logs')
        .insert([{
          campaign_id: campaignId,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_phone: contact.phone,
          status: 'pending',
          duration: 0,
          user_id: user.id
        }])
        .select()
        .single();

      if (logError || !callLog) {
        console.error(`Failed to create call log for contact ${contact.id}:`, logError);
        return;
      }

      // If Vapi key is dummy or empty, we simulate the outbound call
      if (VAPI_API_KEY === "dummy_vapi_key") {
        // Simulated success
        await userInsforge
          .from('call_logs')
          .update({
            status: 'calling',
            vapi_call_id: `sim_call_${Math.random().toString(36).substr(2, 9)}`
          })
          .eq('id', callLog.id);
        return;
      }

      // Real Vapi call trigger
      try {
        const vapiPayload = {
          assistant: {
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en"
            },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                }
              ],
              temperature: Number(temperature)
            },
            voice: {
              provider: "playht",
              voiceId: voiceId
            }
          },
          customer: {
            number: contact.phone,
            name: contact.name
          },
          metadata: {
            contact_id: contact.id,
            campaign_id: campaignId,
            call_log_id: callLog.id,
            user_id: user.id
          }
        };

        const vapiRes = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(vapiPayload)
        });

        if (!vapiRes.ok) {
          const errMsg = await vapiRes.text();
          throw new Error(errMsg || "Vapi API returned error status");
        }

        const vapiData = await vapiRes.json();
        
        // Update Call Log with vapi_call_id
        await userInsforge
          .from('call_logs')
          .update({
            status: 'calling',
            vapi_call_id: vapiData.id
          })
          .eq('id', callLog.id);
      } catch (err: any) {
        console.error(`Failed to trigger Vapi call for contact ${contact.id}:`, err);
        // Mark call log as failed
        await userInsforge
          .from('call_logs')
          .update({
            status: 'failed',
            summary: `Error triggering call: ${err.message}`
          })
          .eq('id', callLog.id);
      }
    });

    await Promise.all(triggerPromises);

    return NextResponse.json({ message: "Campaign calls triggered successfully" });
  } catch (error: any) {
    console.error("Vapi Call Router Error:", error);
    return NextResponse.json({ detail: error.message || "Internal server error" }, { status: 500 });
  }
}
