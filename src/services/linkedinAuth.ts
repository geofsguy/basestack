import type { User, UserIdentity } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { defaultProfileTree, LinkedInConnection, ProfileTree } from '../types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function pickString(source: UnknownRecord | null, keys: string[]) {
  if (!source) return '';

  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function buildFullName(source: UnknownRecord | null) {
  if (!source) return '';

  const explicit = pickString(source, ['name', 'full_name', 'formatted_name']);
  if (explicit) return explicit;

  const given = pickString(source, ['given_name', 'first_name', 'localizedFirstName']);
  const family = pickString(source, ['family_name', 'last_name', 'localizedLastName']);
  return [given, family].filter(Boolean).join(' ').trim();
}

function isLinkedInProvider(provider: string | undefined) {
  return provider === 'linkedin_oidc' || provider === 'linkedin';
}

function extractLinkedInSnapshot(user: User, identity: UserIdentity): Omit<LinkedInConnection, 'lastSyncedAt'> {
  const identityData = asRecord(identity.identity_data);
  const metadata = asRecord(user.user_metadata);

  const name = buildFullName(identityData) || buildFullName(metadata);
  const headline =
    pickString(identityData, ['headline', 'localizedHeadline', 'job_title']) ||
    pickString(metadata, ['headline', 'job_title']);
  const avatarUrl =
    pickString(identityData, ['avatar_url', 'picture', 'profile_picture_url']) ||
    pickString(metadata, ['avatar_url', 'picture']);
  const profileUrl =
    pickString(identityData, ['profile', 'profile_url', 'public_profile_url', 'linkedin_url']) ||
    pickString(metadata, ['profile', 'profile_url', 'linkedin_url']);
  const email =
    pickString(identityData, ['email']) ||
    (user.email || '').trim();

  return {
    connected: true,
    provider: identity.provider,
    connectedAt: identity.created_at || new Date().toISOString(),
    email,
    name,
    headline,
    avatarUrl,
    profileUrl,
  };
}

function preferSyncedValue(current: string, incoming: string, previousSynced: string) {
  if (!incoming) return current;
  if (!current) return incoming;
  if (previousSynced && current === previousSynced) return incoming;
  return current;
}

export async function startLinkedInOAuth(redirectPath = '/dashboard') {
  return supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${window.location.origin}${redirectPath}`,
      scopes: 'openid profile email',
    },
  });
}

export async function linkLinkedInIdentity(redirectPath = '/data-tree') {
  return supabase.auth.linkIdentity({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${window.location.origin}${redirectPath}`,
      scopes: 'openid profile email',
    },
  });
}

export async function getLinkedInConnectionFromSession() {
  const [{ data: userData, error: userError }, { data: identitiesData, error: identitiesError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getUserIdentities(),
  ]);

  if (userError) throw userError;
  if (identitiesError) throw identitiesError;
  if (!userData.user) return null;

  const identity = (identitiesData?.identities || []).find((entry) => isLinkedInProvider(entry.provider));
  if (!identity) return null;

  return extractLinkedInSnapshot(userData.user, identity);
}

export function syncLinkedInConnectionIntoTree(
  prev: ProfileTree,
  snapshot: Omit<LinkedInConnection, 'lastSyncedAt'>,
  forceTimestamp = false,
) {
  const previous = prev.linkedinConnection || defaultProfileTree.linkedinConnection;
  const connectionChanged =
    previous.connected !== snapshot.connected ||
    previous.provider !== snapshot.provider ||
    previous.connectedAt !== snapshot.connectedAt ||
    previous.email !== snapshot.email ||
    previous.name !== snapshot.name ||
    previous.headline !== snapshot.headline ||
    previous.avatarUrl !== snapshot.avatarUrl ||
    previous.profileUrl !== snapshot.profileUrl;

  const nextConnection: LinkedInConnection = {
    ...snapshot,
    lastSyncedAt:
      forceTimestamp || connectionChanged
        ? new Date().toISOString()
        : previous.lastSyncedAt || snapshot.connectedAt,
  };

  return {
    ...prev,
    identity: {
      ...prev.identity,
      name: preferSyncedValue(prev.identity.name, snapshot.name, previous.name),
      role: preferSyncedValue(prev.identity.role, snapshot.headline, previous.headline),
      email: preferSyncedValue(prev.identity.email, snapshot.email, previous.email),
    },
    social: {
      ...prev.social,
      linkedin: preferSyncedValue(prev.social.linkedin, snapshot.profileUrl, previous.profileUrl),
    },
    linkedinConnection: nextConnection,
  };
}
