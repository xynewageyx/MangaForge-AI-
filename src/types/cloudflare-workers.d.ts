// Cloudflare provides this virtual module at Worker runtime.
// Keep the declaration local so TypeScript can check the server entry.
declare module "cloudflare:workers" {
  export const env: {
    AI?: {
      run(model: string, options: { prompt: string; steps: number }): Promise<{ image?: string }>;
    };
    IMAGE_AI_ENABLED?: string;
    IMAGE_AI_ACCESS_KEY?: string;
  };
}
