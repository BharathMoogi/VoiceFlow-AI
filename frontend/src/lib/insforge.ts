import { createClient } from '@insforge/sdk';

const insforgeUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');
const insforgeKey = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');

export const insforge = createClient(insforgeUrl, insforgeKey);
