import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Lock, Sparkles, WandSparkles, X } from 'lucide-react';
import { isPremiumTier, SubscriptionTier } from '../lib/plan';
import {
  AUTO_MAINTAIN_MODE_OPTIONS,
  AUTO_MAINTAIN_SCOPE_OPTIONS,
  AUTO_MAINTAIN_TRIGGER_ITEMS,
  DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES,
  getAutoMaintainModeLabel,
} from '../lib/autoMaintain';
import { saveAutoMaintainSettings } from '../services/autoMaintain';
import { AutoMaintainMode, AutoMaintainScope, SiteAutoMaintainSettings } from '../types';

interface AutoMaintainModalProps {
  open: boolean;
  page: {
    id: string;
    title: string | null;
  } | null;
  currentTier: SubscriptionTier;
  initialSettings: SiteAutoMaintainSettings | null;
  onClose: () => void;
  onSaved: (settings: SiteAutoMaintainSettings) => void;
  onUpgrade: () => void;
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return 'Not yet';
  return new Date(dateValue).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AutoMaintainModal({
  open,
  page,
  currentTier,
  initialSettings,
  onClose,
  onSaved,
  onUpgrade,
}: AutoMaintainModalProps) {
  const hasPremiumAccess = isPremiumTier(currentTier);
  const [enabled, setEnabled] = useState(false);
  const [allowedScopes, setAllowedScopes] = useState<AutoMaintainScope[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState<AutoMaintainMode>('suggest_only');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setEnabled(initialSettings?.enabled ?? false);
    setAllowedScopes(initialSettings?.allowed_scopes ?? []);
    setMaintenanceMode(initialSettings?.maintenance_mode ?? 'suggest_only');
    setError(null);
    setIsSaving(false);
  }, [initialSettings, open]);

  const selectedScopeCount = allowedScopes.length;
  const helperText = useMemo(() => {
    if (!enabled) return 'Turn Auto-Maintain on to start watching approved sections for trigger-based updates.';
    if (selectedScopeCount === 0) return 'Select at least one section so the AI knows exactly what it can touch.';
    return `${selectedScopeCount} section${selectedScopeCount === 1 ? '' : 's'} approved for AI maintenance.`;
  }, [enabled, selectedScopeCount]);

  if (!open || !page) return null;

  const toggleScope = (scope: AutoMaintainScope) => {
    setAllowedScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    );
  };

  const handleSave = async () => {
    if (!hasPremiumAccess) {
      onUpgrade();
      return;
    }

    if (enabled && allowedScopes.length === 0) {
      setError('Choose at least one section before enabling Auto-Maintain.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await saveAutoMaintainSettings({
        page_id: page.id,
        enabled,
        allowed_scopes: allowedScopes,
        maintenance_mode: maintenanceMode,
        trigger_rules: initialSettings?.trigger_rules || DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES,
      });
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unable to save Auto-Maintain settings right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-[2.25rem] border border-white/50 bg-white shadow-[0_40px_120px_-24px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_34%),linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,1))]" />
        <div className="relative z-10 p-8 sm:p-10">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:text-gray-900"
            aria-label="Close Auto-Maintain settings"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700 shadow-sm">
              <WandSparkles className="h-3.5 w-3.5" />
              Auto-Maintain
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] tracking-[0.14em] text-indigo-600">
                Premium
              </span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-950">
              {page.title?.trim() || 'Untitled Site'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
              Let AI keep this site fresh within clear boundaries. Auto-Maintain reacts to meaningful triggers like profile changes,
              new projects, fresh testimonials, and SEO drift instead of making random edits.
            </p>
          </div>

          {!hasPremiumAccess ? (
            <div className="mt-8 overflow-hidden rounded-[2rem] bg-gray-950 p-8 text-white shadow-2xl">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-indigo-300">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-3xl font-semibold tracking-tight">Unlock Auto-Maintain on a paid plan</h3>
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-300">
                    Free sites can view this setup, but enabling AI maintenance is reserved for paid plans. Upgrade to let AI manage approved
                    content updates with review controls and trigger-based refreshes.
                  </p>
                  <button
                    onClick={onUpgrade}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition-transform hover:scale-[1.02]"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    View paid plans
                  </button>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Included on paid plans</p>
                  <div className="mt-4 space-y-3">
                    {[
                      'Approve the exact sections AI is allowed to touch',
                      'Choose Suggest only, Smart approve, or Fully automatic',
                      'Run only on triggers like new projects, bio changes, and SEO drift',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                        <p className="text-sm text-gray-200">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-indigo-100 bg-white/90 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Status</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">Keep this site up to date</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{helperText}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnabled((current) => !current)}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                        enabled ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      aria-pressed={enabled}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-gray-100 bg-white/90 p-6 shadow-sm">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Approved sections</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">What AI is allowed to maintain</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      Only the sections you approve here are eligible for future updates.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {AUTO_MAINTAIN_SCOPE_OPTIONS.map((option) => {
                      const selected = allowedScopes.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleScope(option.value)}
                          className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                            selected
                              ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-500">{option.description}</p>
                            </div>
                            <div
                              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                                selected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-300 text-transparent'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-gray-100 bg-white/90 p-6 shadow-sm">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Maintenance mode</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-950">How much autonomy AI gets</h3>
                  </div>

                  <div className="space-y-3">
                    {AUTO_MAINTAIN_MODE_OPTIONS.map((option) => {
                      const selected = maintenanceMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMaintenanceMode(option.value)}
                          className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
                            selected
                              ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-500">{option.description}</p>
                            </div>
                            <div
                              className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border ${
                                selected ? 'border-indigo-500 bg-indigo-600' : 'border-gray-300 bg-white'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-gray-100 bg-white/90 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Trigger engine</p>
                      <h3 className="text-lg font-semibold tracking-tight text-gray-950">Updates happen on signals</h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(initialSettings?.trigger_rules || DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES) &&
                      AUTO_MAINTAIN_TRIGGER_ITEMS.filter(
                        (item) => (initialSettings?.trigger_rules || DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES)[item.key],
                      ).map((item) => (
                        <div key={item.key} className="rounded-[1.25rem] border border-gray-100 bg-gray-50/80 px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
                        </div>
                      ))}
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Current mode</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-950">{getAutoMaintainModeLabel(maintenanceMode)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                      Last trigger evaluation: {formatDate(initialSettings?.last_evaluated_at || null)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-[1.5rem] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-gray-500">
              Auto-Maintain stays inside approved sections and waits for trigger signals before it proposes or applies any change.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : hasPremiumAccess ? 'Save Auto-Maintain' : 'Unlock on paid plans'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
