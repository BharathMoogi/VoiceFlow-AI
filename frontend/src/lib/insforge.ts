import { createClient as originalCreateClient } from '@insforge/sdk';

const rawEnvUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');

const insforgeUrl = rawEnvUrl;

const insforgeKey = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(config?: any) {
  const client = originalCreateClient(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).from = function(table: string) {
    return client.database.from(table);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeKey
});
