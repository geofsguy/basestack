import { UserData, SiteContent, ProfileTree } from '../types';
import { sanitizeGeneratedHtml } from './htmlSanitizer';
import { supabase } from '../supabaseClient';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use AI features.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload as T;
}

export async function generateWebsiteContent(userData: UserData, profileTree?: ProfileTree | null): Promise<SiteContent> {
  const siteContent = await postJson<SiteContent>('/api/ai/generate', { userData, profileTree });
  return {
    ...siteContent,
    html: sanitizeGeneratedHtml(siteContent.html),
  };
}

export async function refineWebsiteContent(currentHtml: string, refinementPrompt: string): Promise<SiteContent> {
  const siteContent = await postJson<SiteContent>('/api/ai/refine', { currentHtml, refinementPrompt });
  return {
    ...siteContent,
    html: sanitizeGeneratedHtml(siteContent.html),
  };
}

export async function parseLinkedInText(text: string): Promise<Partial<ProfileTree>> {
  return postJson<Partial<ProfileTree>>('/api/ai/parse-linkedin', { text });
}
