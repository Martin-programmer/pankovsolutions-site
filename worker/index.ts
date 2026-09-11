/// <reference types="@cloudflare/workers-types" />
import { onRequest as inquiryGet, onRequestPost as inquiryPost } from '../functions/api/inquiry';
import { onRequest as surveyGet, onRequestPost as surveyPost } from '../functions/api/survey';

// Worker със статични файлове (Cloudflare Workers Builds; Pages вече не се предлага за нови
// акаунти). Всичко, което не е API, идва от dist/ през ASSETS binding-а - заедно с _headers и
// _redirects. Формите остават същият код в functions/api/*.ts (формат на Pages Functions).
interface Env {
  ASSETS: Fetcher;
  [key: string]: unknown;
}

type Handler = Parameters<typeof inquiryPost>[0] extends infer C ? (context: C) => Promise<Response> | Response : never;

// /api/inquiry - формата за запитване; /api/survey - анкетата за допустимост на лендингите.
const ROUTES: Record<string, { post: Handler; other: Handler }> = {
  '/api/inquiry': { post: inquiryPost as Handler, other: inquiryGet as Handler },
  '/api/survey': { post: surveyPost as Handler, other: surveyGet as Handler },
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];
    if (route) {
      const context = {
        request,
        env,
        params: {},
        data: {},
        functionPath: url.pathname,
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: ctx.passThroughOnException.bind(ctx),
        next: () => env.ASSETS.fetch(request),
      } as unknown as Parameters<Handler>[0];
      return request.method === 'POST' ? route.post(context) : route.other(context);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
