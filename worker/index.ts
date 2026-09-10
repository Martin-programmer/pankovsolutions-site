/// <reference types="@cloudflare/workers-types" />
import { onRequest, onRequestPost } from '../functions/api/inquiry';

// Worker със статични файлове (Cloudflare Workers Builds; Pages вече не се предлага за нови
// акаунти). Всичко, което не е /api/inquiry, идва от dist/ през ASSETS binding-а — заедно
// с _headers и _redirects. Формата остава същият код в functions/api/inquiry.ts.
interface Env {
  ASSETS: Fetcher;
  [key: string]: unknown;
}

const API = '/api/inquiry';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === API) {
      const context = {
        request,
        env,
        params: {},
        data: {},
        functionPath: API,
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: ctx.passThroughOnException.bind(ctx),
        next: () => env.ASSETS.fetch(request),
      } as unknown as Parameters<typeof onRequestPost>[0];
      return request.method === 'POST' ? onRequestPost(context) : onRequest(context);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
