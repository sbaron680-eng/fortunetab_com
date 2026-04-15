/**
 * Supabase Server Clients (service_role + user-scoped)
 *
 * NEVER import this file from client components.
 * `server-only` will throw a build error if accidentally bundled for the browser.
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function getUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

/** Admin client (service_role key). Use only for operations that need elevated privileges. */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(getUrl(), serviceKey);
}

/**
 * User-scoped client from request Bearer token.
 * Returns null if no valid Bearer token is present — caller should return 401.
 */
export function createUserClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

  return createClient(getUrl(), anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
