import { createClient as originalCreateClient } from '@insforge/sdk';

const rawEnvUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');

const isBrowser = typeof window !== 'undefined';
const insforgeUrl = isBrowser ? `${window.location.origin}/insforge-proxy` : rawEnvUrl;

const insforgeKey = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');

export function createClient(config?: any) {
  const client = originalCreateClient(config);
  (client as any).from = function(table: string) {
    return client.database.from(table);
  };
  return client as any;
}

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeKey
});
