import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Lock, Sparkles, WandSparkles, X, ChevronRight, Activity } from 'lucide-react';
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
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),_0_32px_96px_-16px_rgba(0,0,0,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Sleek background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 pointer-events-none" />
        <div className="absolute -right-64 -top-64 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex max-h-[90vh] flex-col">
          {/* Header */}
          <div className="flex-none px-8 pt-8 pb-6 sm:px-10 sm:pt-10">
            <button
              onClick={onClose}
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all hover:bg-slate-200/50 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <WandSparkles className="h-4 w-4" />
                Auto-Maintain
                <span className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                  Premium
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {page.title?.trim() || 'Untitled Site'}
              </h2>
              <p className="mt-3 text-base text-slate-500 max-w-xl leading-relaxed">
                Let AI keep this site fresh within clear boundaries. Auto-Maintain reacts to meaningful triggers like profile changes and new projects instead of making random edits.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 sm:px-10 shadow-[inset_0_15px_15px_-15px_rgba(0,0,0,0.03)] pt-2">
            {!hasPremiumAccess ? (
              <div className="relative mt-2 overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 sm:p-12 text-white shadow-2xl">
                <div className="absolute -left-32 -top-32 h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-purple-500/20 blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-indigo-300 ring-1 ring-white/20 backdrop-blur-xl">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">Automate your updates</h3>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
                      Free sites can view this setup, but enabling AI maintenance is reserved for paid plans. Upgrade to let AI manage approved content updates with complete review controls.
                    </p>
                    <button
                      onClick={onUpgrade}
                      className="mt-8 group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 transition-all hover:bg-slate-100 hover:scale-[1.02]"
                    >
                      <Sparkles className="h-5 w-5 text-indigo-500" />
                      View paid plans
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-6">Included on paid plans</p>
                    <div className="space-y-4">
                      {[
                        'Approve exact sections AI can modify',
                        'Suggest only, Smart approve, or Auto',
                        'Run on triggers like new projects or SEO drift',
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-4">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-sm font-medium text-slate-200">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid gap-8 lg:grid-cols-2">
                <div className="space-y-8">
                  {/* Status Toggle */}
                  <div className="group relative overflow-hidden rounded-[2.5rem] bg-white p-6 sm:p-8 ring-1 ring-slate-200 transition-all hover:ring-indigo-200 shadow-sm hover:shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                    <div className="relative z-10 flex items-start justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                            <Activity className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Status</p>
                            <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Keep up to date</h3>
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">{helperText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnabled((current) => !current)}
                        className={`relative inline-flex h-10 w-16 shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors duration-300 ease-in-out focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                          enabled ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                        aria-pressed={enabled}
                      >
                        <span className="sr-only">Toggle auto-maintain</span>
                        <span
                          className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-sm ring-1 ring-slate-900/5 transition duration-300 ease-in-out ${
                            enabled ? 'translate-x-[22px]' : 'translate-x-[4px]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Approved Sections */}
                  <div className="rounded-[2.5rem] bg-slate-50 p-6 sm:p-8 ring-1 ring-slate-200/60">
                    <div className="mb-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Approved sections</p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">What AI can maintain</h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                        Only approved sections are eligible for future updates.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {AUTO_MAINTAIN_SCOPE_OPTIONS.map((option) => {
                        const selected = allowedScopes.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleScope(option.value)}
                            className={`group flex items-center justify-between gap-4 rounded-3xl p-4 text-left transition-all ${
                              selected
                                ? 'bg-white ring-2 ring-indigo-500 shadow-md'
                                : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div>
                              <p className={`text-base font-bold ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                {option.label}
                              </p>
                              <p className={`mt-1 text-sm ${selected ? 'text-indigo-600' : 'text-slate-500'}`}>
                                {option.description}
                              </p>
                            </div>
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                                selected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-transparent group-hover:bg-slate-200'
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Maintenance Mode */}
                  <div className="rounded-[2.5rem] bg-slate-50 p-6 sm:p-8 ring-1 ring-slate-200/60">
                    <div className="mb-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Maintenance mode</p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">AI Autonomy</h3>
                    </div>

                    <div className="space-y-3">
                      {AUTO_MAINTAIN_MODE_OPTIONS.map((option) => {
                        const selected = maintenanceMode === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMaintenanceMode(option.value)}
                            className={`group flex items-start gap-4 rounded-3xl p-4 text-left transition-all ${
                              selected
                                ? 'bg-indigo-50 ring-2 ring-indigo-500'
                                : 'bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="pt-1">
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] transition-colors ${
                                  selected ? 'border-indigo-500 bg-white' : 'border-slate-300 group-hover:border-slate-400'
                                }`}
                              >
                                {selected && <div className="h-2 w-2 rounded-full bg-indigo-500" />}
                              </div>
                            </div>
                            <div>
                              <p className={`text-base font-bold ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                {option.label}
                              </p>
                              <p className={`mt-1 text-sm ${selected ? 'text-indigo-600' : 'text-slate-500'}`}>
                                {option.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Engine */}
                  <div className="rounded-[2.5rem] bg-slate-50 p-6 sm:p-8 ring-1 ring-slate-200/60">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/50">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Trigger engine</p>
                        <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Updates on signals</h3>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {(initialSettings?.trigger_rules || DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES) &&
                        AUTO_MAINTAIN_TRIGGER_ITEMS.filter(
                          (item) => (initialSettings?.trigger_rules || DEFAULT_AUTO_MAINTAIN_TRIGGER_RULES)[item.key],
                        ).map((item) => (
                          <div key={item.key} className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                          </div>
                        ))}
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
                      <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Current mode</p>
                      </div>
                      <div className="p-4">
                        <p className="text-base font-bold text-slate-900">{getAutoMaintainModeLabel(maintenanceMode)}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Last evaluated: {formatDate(initialSettings?.last_evaluated_at || null)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                {error}
              </div>
            )}
          </div>

          <div className="flex-none border-t border-slate-100 bg-slate-50/80 p-6 sm:px-10 rounded-b-[2.5rem]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500 sm:max-w-md">
                Auto-Maintain stays inside approved sections and waits for trigger signals.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : hasPremiumAccess ? 'Save Configuration' : 'Unlock on paid plans'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
