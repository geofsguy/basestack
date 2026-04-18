import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Briefcase, GraduationCap, Cpu, Rocket, Trophy,
  Link2, Heart, Target, Plus, Trash2, ChevronDown, X,
  Linkedin, Loader2, CheckCircle2, AlertCircle, Save,
  ArrowLeft, Sparkles, ExternalLink,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ProfileTree, defaultProfileTree, ExperienceEntry, EducationEntry, SkillEntry, ProjectEntry, AchievementEntry, CustomField } from '../types';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';
import { parseLinkedInText } from '../services/gemini';
import { loadProfileTree, saveProfileTree, deleteProfileTree } from '../services/profileTreeStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InlineField({
  label,
  value,
  onChange,
  placeholder = '',
  multiline = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && multiline) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value, multiline]);

  const base =
    'w-full bg-transparent text-[15px] text-gray-800 placeholder:text-gray-300 outline-none focus:bg-gray-50 rounded-xl px-3 py-2 transition-colors -mx-3 resize-none';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-300">{label}</span>
      {multiline ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={base + ' overflow-hidden'}
          style={{ minHeight: '2.5rem' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[15px] text-gray-800 outline-none focus:bg-gray-50 rounded-xl px-3 py-2 transition-colors -mx-3 cursor-pointer appearance-none"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function EntryCard({
  title,
  subtitle,
  onDelete,
  children,
}: {
  title: string;
  subtitle?: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="border border-gray-100 rounded-2xl overflow-hidden"
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-gray-800 truncate">{title || <span className="text-gray-300 font-normal">New entry</span>}</p>
          {subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  defaultOpen = true,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
      <div
        className="flex items-center justify-between px-6 py-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-gray-500" style={{ width: 18, height: 18 }} />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-gray-900 tracking-tight">{title}</span>
            {count !== undefined && count > 0 && (
              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronDown className={`w-4.5 h-4.5 text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ width: 18, height: 18 }} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-50 px-6 py-6 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── LinkedIn Import Modal ────────────────────────────────────────────────────

function LinkedInModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (partial: Partial<ProfileTree>) => void;
}) {
  const [tab, setTab] = useState<'paste' | 'csv'>('paste');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [parsed, setParsed] = useState<Partial<ProfileTree> | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const handleParse = async () => {
    if (!text.trim()) return;
    setStatus('parsing');
    setErrMsg('');
    try {
      // Check and increment usage limits securely
      const { data: canGenerate, error: rpcError } = await supabase.rpc('increment_usage');
      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error("Failed to verify usage limits. Please try again later.");
      }
      
      if (!canGenerate) {
        throw new Error("You have reached your free limit (1 operation). Please upgrade to Pro in Settings to continue.");
      }

      const result = await parseLinkedInText(text);
      setParsed(result);
      setStatus('done');
    } catch (e: any) {
      setErrMsg(e.message || 'Parsing failed.');
      setStatus('error');
    }
  };

  const handleApply = () => {
    if (parsed) onApply(parsed);
    onClose();
  };

  return (
    <motion.div
      key="li-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        key="li-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-[2rem] shadow-2xl shadow-black/10 w-full max-w-2xl border border-gray-100 overflow-hidden"
      >
        {/* Dot grid */}
        <div className="absolute inset-0 z-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 p-8">
          {/* Header */}
          <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-11 h-11 bg-black rounded-[14px] flex items-center justify-center shadow-xl shadow-black/10">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight text-gray-900">Import from LinkedIn</h2>
              <p className="text-sm text-gray-400">Paste your profile text and AI will fill your Data Tree</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-2xl p-1 mt-5 mb-5">
            {(['paste', 'csv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t === 'paste' ? '📋  Paste Profile Text' : '📁  Upload Export CSV'}
              </button>
            ))}
          </div>

          {tab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-[13px] text-blue-700 leading-relaxed">
                <strong>How to get your profile text:</strong> Visit your LinkedIn profile → Select all text (Ctrl+A) → Copy → Paste below. Or copy individual sections like About, Experience, Skills.
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your LinkedIn profile text here…"
                rows={10}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-[14px] text-gray-800 font-mono placeholder:text-gray-300 outline-none focus:border-gray-400 focus:bg-white transition-all resize-none"
              />
            </div>
          )}

          {tab === 'csv' && (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-medium text-gray-600">Upload LinkedIn data export CSVs</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Go to LinkedIn → Settings → Data Privacy → Get a copy of your data → Request archive.<br />
                Then upload <code className="bg-gray-200 rounded px-1">Profile.csv</code>, <code className="bg-gray-200 rounded px-1">Positions.csv</code>, <code className="bg-gray-200 rounded px-1">Skills.csv</code>.
              </p>
              <p className="text-xs text-gray-300 mt-2">For now, paste in the text tab for instant results with AI parsing.</p>
            </div>
          )}

          {/* Status */}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errMsg}
            </div>
          )}
          {status === 'done' && parsed && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">Parsed successfully</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsed.identity?.name && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">Name: {parsed.identity.name}</span>}
                {parsed.identity?.role && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">Role: {parsed.identity.role}</span>}
                {(parsed.experience?.length ?? 0) > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{parsed.experience!.length} experience{parsed.experience!.length !== 1 ? 's' : ''}</span>}
                {(parsed.education?.length ?? 0) > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{parsed.education!.length} education</span>}
                {(parsed.skills?.length ?? 0) > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{parsed.skills!.length} skills</span>}
                {(parsed.projects?.length ?? 0) > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{parsed.projects!.length} projects</span>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {status !== 'done' ? (
              <button
                onClick={handleParse}
                disabled={!text.trim() || status === 'parsing'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-black/10"
              >
                {status === 'parsing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Parsing with AI…</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Parse with AI</>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Apply to Data Tree
                </button>
                <button onClick={() => { setStatus('idle'); setParsed(null); }} className="px-5 py-3 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                  Re-parse
                </button>
              </>
            )}
            <button onClick={onClose} className="px-5 py-3 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const DATA_TREE_WELCOME_KEY = 'basestack-data-tree-welcome-seen';

function DataTreeWelcomeModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <motion.div
      key="data-tree-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        key="data-tree-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl shadow-black/10"
      >
        <div
          className="absolute inset-0 z-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        <div className="relative z-10 p-8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-black shadow-xl shadow-black/10">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight text-gray-900">This is your Data Tree</h2>
              <p className="text-sm text-gray-400">A living profile BaseStack uses to build smarter, richer sites for you.</p>
            </div>
          </div>

          <div className="space-y-3 text-[15px] leading-relaxed text-gray-600">
            <p>
              Think of this as your structured personal knowledge base. Your experience, projects, links, goals, and details all live here in one place.
            </p>
            <p>
              Every time you generate a site, BaseStack pulls from this tree to write better copy, surface stronger proof, and keep your story consistent.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <p className="text-sm font-medium text-gray-900">Fill it once</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Add the core details once instead of rewriting them for every site.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <p className="text-sm font-medium text-gray-900">Keep it growing</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Update your tree as your work, wins, and interests evolve.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
              <p className="text-sm font-medium text-gray-900">Generate faster</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">A stronger tree gives the AI better raw material to work with.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-700">
            Tip: you can start by importing LinkedIn, then refine the details section by section.
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-xl shadow-black/10 transition-all hover:bg-gray-800"
            >
              Start Building My Tree
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DataTreeDeleteModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmText.toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <motion.div
      key="data-tree-delete-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        key="data-tree-delete-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl shadow-black/10"
      >
        <div className="relative z-10 p-8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-5 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-red-50 shadow-sm border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight text-gray-900">Delete Data Tree</h2>
            </div>
          </div>

          <div className="space-y-3 text-[15px] leading-relaxed text-gray-600">
            <p>
              Are you sure you want to delete your Data Tree? This action <strong className="text-gray-900">cannot be undone</strong> and all of your structured profile data will be permanently lost.
            </p>
            <p>
              Please type <strong className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">delete</strong> below to confirm.
            </p>
          </div>

          <div className="mt-5">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-[14px] text-gray-800 focus:border-red-400 focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirmText.toLowerCase() !== 'delete' || isDeleting}
              className="flex-1 rounded-full bg-red-500 px-5 py-3 text-sm font-medium text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete My Data Tree'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export default function DataTreePage() {
  const navigate = useNavigate();
  const [tree, setTree] = useState<ProfileTree>(defaultProfileTree);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteTree = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await deleteProfileTree(user.id);
    setTree(defaultProfileTree);
    setSaveStatus('saved');
    setShowDeleteConfirm(false);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const profileTree = await loadProfileTree(user.id);
      if (profileTree) {
        setTree({ ...defaultProfileTree, ...profileTree });
      }
      if (typeof window !== 'undefined' && !window.localStorage.getItem(DATA_TREE_WELCOME_KEY)) {
        setShowWelcome(true);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const closeWelcome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DATA_TREE_WELCOME_KEY, 'true');
    }
    setShowWelcome(false);
  }, []);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  const persist = useCallback(async (snapshot: ProfileTree) => {
    setSaveStatus('saving');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveStatus('error'); return; }
    try {
      await saveProfileTree(user.id, snapshot);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const updateTree = useCallback((updater: (prev: ProfileTree) => ProfileTree) => {
    setTree((prev) => {
      const next = updater(prev);
      setSaveStatus('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 1200);
      return next;
    });
  }, [persist]);

  // ── Identity ──────────────────────────────────────────────────────────────
  const setId = (key: keyof ProfileTree['identity'], val: string) =>
    updateTree((p) => ({ ...p, identity: { ...p.identity, [key]: val } }));

  // ── Social ────────────────────────────────────────────────────────────────
  const setSocial = (key: keyof ProfileTree['social'], val: string) =>
    updateTree((p) => ({ ...p, social: { ...p.social, [key]: val } }));

  // ── Personal ──────────────────────────────────────────────────────────────
  const setPersonal = (key: keyof ProfileTree['personal'], val: string) =>
    updateTree((p) => ({ ...p, personal: { ...p.personal, [key]: val } }));

  // ── Goals ─────────────────────────────────────────────────────────────────
  const setGoal = (key: keyof ProfileTree['goals'], val: string) =>
    updateTree((p) => ({ ...p, goals: { ...p.goals, [key]: val } }));

  // ── Experience ────────────────────────────────────────────────────────────
  const addExp = () => updateTree((p) => ({
    ...p,
    experience: [...p.experience, { id: uid(), company: '', title: '', duration: '', description: '', achievements: '', url: '' }],
  }));
  const setExp = (id: string, key: keyof ExperienceEntry, val: string) =>
    updateTree((p) => ({ ...p, experience: p.experience.map((e) => e.id === id ? { ...e, [key]: val } : e) }));
  const delExp = (id: string) =>
    updateTree((p) => ({ ...p, experience: p.experience.filter((e) => e.id !== id) }));

  // ── Education ─────────────────────────────────────────────────────────────
  const addEdu = () => updateTree((p) => ({
    ...p,
    education: [...p.education, { id: uid(), school: '', degree: '', field: '', year: '', gpa: '', highlights: '' }],
  }));
  const setEdu = (id: string, key: keyof EducationEntry, val: string) =>
    updateTree((p) => ({ ...p, education: p.education.map((e) => e.id === id ? { ...e, [key]: val } : e) }));
  const delEdu = (id: string) =>
    updateTree((p) => ({ ...p, education: p.education.filter((e) => e.id !== id) }));

  // ── Skills ────────────────────────────────────────────────────────────────
  const addSkill = () => updateTree((p) => ({
    ...p,
    skills: [...p.skills, { id: uid(), name: '', level: 'Intermediate', category: 'Other' }],
  }));
  const setSkill = (id: string, key: keyof SkillEntry, val: string) =>
    updateTree((p) => ({ ...p, skills: p.skills.map((s) => s.id === id ? { ...s, [key]: val } : s) }));
  const delSkill = (id: string) =>
    updateTree((p) => ({ ...p, skills: p.skills.filter((s) => s.id !== id) }));

  // ── Projects ──────────────────────────────────────────────────────────────
  const addProject = () => updateTree((p) => ({
    ...p,
    projects: [...p.projects, { id: uid(), name: '', description: '', url: '', stack: '', status: 'Active', highlights: '' }],
  }));
  const setProject = (id: string, key: keyof ProjectEntry, val: string) =>
    updateTree((p) => ({ ...p, projects: p.projects.map((proj) => proj.id === id ? { ...proj, [key]: val } : proj) }));
  const delProject = (id: string) =>
    updateTree((p) => ({ ...p, projects: p.projects.filter((proj) => proj.id !== id) }));

  // ── Achievements ──────────────────────────────────────────────────────────
  const addAch = () => updateTree((p) => ({
    ...p,
    achievements: [...p.achievements, { id: uid(), title: '', organization: '', year: '', description: '' }],
  }));
  const setAch = (id: string, key: keyof AchievementEntry, val: string) =>
    updateTree((p) => ({ ...p, achievements: p.achievements.map((a) => a.id === id ? { ...a, [key]: val } : a) }));
  const delAch = (id: string) =>
    updateTree((p) => ({ ...p, achievements: p.achievements.filter((a) => a.id !== id) }));

  // ── Custom Fields ─────────────────────────────────────────────────────────
  const addCustom = () => updateTree((p) => ({
    ...p,
    custom: [...p.custom, { id: uid(), key: '', value: '' }],
  }));
  const setCustom = (id: string, key: keyof CustomField, val: string) =>
    updateTree((p) => ({ ...p, custom: p.custom.map((c) => c.id === id ? { ...c, [key]: val } : c) }));
  const delCustom = (id: string) =>
    updateTree((p) => ({ ...p, custom: p.custom.filter((c) => c.id !== id) }));

  // ── LinkedIn Apply ────────────────────────────────────────────────────────
  const applyLinkedIn = (partial: Partial<ProfileTree>) => {
    updateTree((prev) => {
      const next = { ...prev };
      if (partial.identity) next.identity = { ...prev.identity, ...Object.fromEntries(Object.entries(partial.identity).filter(([, v]) => v)) };
      if (partial.social) next.social = { ...prev.social, ...Object.fromEntries(Object.entries(partial.social).filter(([, v]) => v)) };
      if (partial.personal) next.personal = { ...prev.personal, ...Object.fromEntries(Object.entries(partial.personal).filter(([, v]) => v)) };
      if (partial.goals) next.goals = { ...prev.goals, ...Object.fromEntries(Object.entries(partial.goals).filter(([, v]) => v)) };
      if (partial.experience?.length) next.experience = [...prev.experience, ...partial.experience.map((e) => ({ ...e, id: uid() }))];
      if (partial.education?.length) next.education = [...prev.education, ...partial.education.map((e) => ({ ...e, id: uid() }))];
      if (partial.skills?.length) next.skills = [...prev.skills, ...partial.skills.map((s) => ({ ...s, id: uid() }))];
      if (partial.projects?.length) next.projects = [...prev.projects, ...partial.projects.map((p) => ({ ...p, id: uid() }))];
      if (partial.achievements?.length) next.achievements = [...prev.achievements, ...partial.achievements.map((a) => ({ ...a, id: uid() }))];
      return next;
    });
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  const SaveIndicator = () => ({
    saved: <span className="flex items-center gap-1.5 text-xs text-gray-400"><CheckCircle2 className="w-3.5 h-3.5" />Saved</span>,
    unsaved: <span className="flex items-center gap-1.5 text-xs text-gray-300"><Save className="w-3.5 h-3.5" />Unsaved changes</span>,
    saving: <span className="flex items-center gap-1.5 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</span>,
    error: <span className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5" />Save failed</span>,
  }[saveStatus]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans relative overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <Logo className="w-7 h-7 text-black" />
              <span className="font-bold text-lg tracking-tight">BaseStack</span>
            </div>
          </div>
          <SaveIndicator />
        </header>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-gray-900 mb-2">My Data Tree</h1>
              <p className="text-gray-400 text-[15px] leading-relaxed max-w-md">
                Everything BaseStack knows about you. Add data here once — it enriches every site you generate.
              </p>
            </div>
            <button
              onClick={() => setShowLinkedIn(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex-shrink-0"
            >
              <Linkedin className="w-4 h-4" />
              Import LinkedIn
            </button>
          </div>
        </motion.div>

        {/* Tree Sections */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="space-y-4"
        >
          {/* ── Identity ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={User} title="Identity" defaultOpen>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InlineField label="Full Name" value={tree.identity.name} onChange={(v) => setId('name', v)} placeholder="August Quillen" />
                <InlineField label="Role / Title" value={tree.identity.role} onChange={(v) => setId('role', v)} placeholder="Software Engineer" />
                <InlineField label="Location" value={tree.identity.location} onChange={(v) => setId('location', v)} placeholder="San Francisco, CA" />
                <InlineField label="Email" value={tree.identity.email} onChange={(v) => setId('email', v)} placeholder="you@email.com" type="email" />
                <InlineField label="Tagline" value={tree.identity.tagline} onChange={(v) => setId('tagline', v)} placeholder="Building the future, one commit at a time" />
                <InlineField label="Availability" value={tree.identity.availability} onChange={(v) => setId('availability', v)} placeholder="Open to opportunities" />
              </div>
              <InlineField label="Bio / Summary" value={tree.identity.bio} onChange={(v) => setId('bio', v)} placeholder="Tell your story…" multiline />
            </Section>
          </motion.div>

          {/* ── Work Experience ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Briefcase} title="Work Experience" count={tree.experience.length}>
              <AnimatePresence>
                {tree.experience.map((exp) => (
                  <div key={exp.id}>
                    <EntryCard
                      title={exp.company || ''}
                      subtitle={exp.title || undefined}
                      onDelete={() => delExp(exp.id)}
                    >
                      <InlineField label="Company" value={exp.company} onChange={(v) => setExp(exp.id, 'company', v)} placeholder="Google" />
                      <InlineField label="Job Title" value={exp.title} onChange={(v) => setExp(exp.id, 'title', v)} placeholder="Senior Engineer" />
                      <InlineField label="Duration" value={exp.duration} onChange={(v) => setExp(exp.id, 'duration', v)} placeholder="Jan 2022 – Present" />
                      <InlineField label="Company URL" value={exp.url} onChange={(v) => setExp(exp.id, 'url', v)} placeholder="https://google.com" type="url" />
                      <div className="sm:col-span-2">
                        <InlineField label="Description" value={exp.description} onChange={(v) => setExp(exp.id, 'description', v)} placeholder="What did you do?" multiline />
                      </div>
                      <div className="sm:col-span-2">
                        <InlineField label="Key Achievements" value={exp.achievements} onChange={(v) => setExp(exp.id, 'achievements', v)} placeholder="• Led team of 5… • Reduced load time by 40%…" multiline />
                      </div>
                    </EntryCard>
                  </div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Experience" onClick={addExp} />
            </Section>
          </motion.div>

          {/* ── Education ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={GraduationCap} title="Education" count={tree.education.length}>
              <AnimatePresence>
                {tree.education.map((edu) => (
                  <div key={edu.id}>
                    <EntryCard
                      title={edu.school || ''}
                      subtitle={edu.degree ? `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}` : undefined}
                      onDelete={() => delEdu(edu.id)}
                    >
                      <InlineField label="School" value={edu.school} onChange={(v) => setEdu(edu.id, 'school', v)} placeholder="MIT" />
                      <InlineField label="Degree" value={edu.degree} onChange={(v) => setEdu(edu.id, 'degree', v)} placeholder="B.S. / M.S. / PhD" />
                      <InlineField label="Field of Study" value={edu.field} onChange={(v) => setEdu(edu.id, 'field', v)} placeholder="Computer Science" />
                      <InlineField label="Graduation Year" value={edu.year} onChange={(v) => setEdu(edu.id, 'year', v)} placeholder="2024" />
                      <InlineField label="GPA" value={edu.gpa} onChange={(v) => setEdu(edu.id, 'gpa', v)} placeholder="3.9 / 4.0" />
                      <div className="sm:col-span-2">
                        <InlineField label="Highlights / Activities" value={edu.highlights} onChange={(v) => setEdu(edu.id, 'highlights', v)} placeholder="Dean's List, Robotics Club, Hackathon winner…" multiline />
                      </div>
                    </EntryCard>
                  </div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Education" onClick={addEdu} />
            </Section>
          </motion.div>

          {/* ── Skills & Tools ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Cpu} title="Skills & Tools" count={tree.skills.length}>
              {tree.skills.length > 0 && (
                <div className="space-y-2">
                  <AnimatePresence>
                    {tree.skills.map((skill) => (
                      <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-3 border border-gray-100 rounded-2xl px-4 py-3"
                      >
                        <input
                          value={skill.name}
                          onChange={(e) => setSkill(skill.id, 'name', e.target.value)}
                          placeholder="React"
                          className="flex-1 min-w-0 bg-transparent text-[15px] text-gray-800 placeholder:text-gray-300 outline-none"
                        />
                        <select
                          value={skill.category}
                          onChange={(e) => setSkill(skill.id, 'category', e.target.value)}
                          className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none cursor-pointer"
                        >
                          {['Language', 'Framework', 'Tool', 'Soft Skill', 'Other'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <select
                          value={skill.level}
                          onChange={(e) => setSkill(skill.id, 'level', e.target.value)}
                          className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none cursor-pointer"
                        >
                          {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <button onClick={() => delSkill(skill.id)} className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <AddButton label="Add Skill / Tool" onClick={addSkill} />
            </Section>
          </motion.div>

          {/* ── Projects ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Rocket} title="Projects" count={tree.projects.length}>
              <AnimatePresence>
                {tree.projects.map((proj) => (
                  <div key={proj.id}>
                    <EntryCard
                      title={proj.name || ''}
                      subtitle={proj.status || undefined}
                      onDelete={() => delProject(proj.id)}
                    >
                      <InlineField label="Project Name" value={proj.name} onChange={(v) => setProject(proj.id, 'name', v)} placeholder="BaseStack" />
                      <SelectField
                        label="Status"
                        value={proj.status}
                        onChange={(v) => setProject(proj.id, 'status', v)}
                        options={['Active', 'Completed', 'Archived', 'In Progress']}
                      />
                      <InlineField label="Live URL" value={proj.url} onChange={(v) => setProject(proj.id, 'url', v)} placeholder="https://yourproject.com" type="url" />
                      <InlineField label="Tech Stack" value={proj.stack} onChange={(v) => setProject(proj.id, 'stack', v)} placeholder="React, Supabase, TypeScript…" />
                      <div className="sm:col-span-2">
                        <InlineField label="Description" value={proj.description} onChange={(v) => setProject(proj.id, 'description', v)} placeholder="What does this project do?" multiline />
                      </div>
                      <div className="sm:col-span-2">
                        <InlineField label="Highlights / Impact" value={proj.highlights} onChange={(v) => setProject(proj.id, 'highlights', v)} placeholder="• 1,000 users in first week…" multiline />
                      </div>
                    </EntryCard>
                  </div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Project" onClick={addProject} />
            </Section>
          </motion.div>

          {/* ── Achievements ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Trophy} title="Achievements" count={tree.achievements.length}>
              <AnimatePresence>
                {tree.achievements.map((ach) => (
                  <div key={ach.id}>
                    <EntryCard
                      title={ach.title || ''}
                      subtitle={ach.organization ? `${ach.organization}${ach.year ? ` · ${ach.year}` : ''}` : undefined}
                      onDelete={() => delAch(ach.id)}
                    >
                      <InlineField label="Award / Certification" value={ach.title} onChange={(v) => setAch(ach.id, 'title', v)} placeholder="1st Place Hackathon" />
                      <InlineField label="Organization" value={ach.organization} onChange={(v) => setAch(ach.id, 'organization', v)} placeholder="HackMIT" />
                      <InlineField label="Year" value={ach.year} onChange={(v) => setAch(ach.id, 'year', v)} placeholder="2024" />
                      <div className="sm:col-span-2">
                        <InlineField label="Description" value={ach.description} onChange={(v) => setAch(ach.id, 'description', v)} placeholder="What did you achieve?" multiline />
                      </div>
                    </EntryCard>
                  </div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Achievement" onClick={addAch} />
            </Section>
          </motion.div>

          {/* ── Social Links ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Link2} title="Social Links">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(Object.keys(tree.social) as (keyof ProfileTree['social'])[]).map((key) => (
                  <div key={key}>
                    <InlineField
                      label={key.charAt(0).toUpperCase() + key.slice(1)}
                      value={tree.social[key]}
                      onChange={(v) => setSocial(key, v)}
                      placeholder={`https://${key === 'other' ? 'yoursite.com' : `${key}.com/username`}`}
                      type="url"
                    />
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>

          {/* ── Personal ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Heart} title="Personal">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InlineField label="Interests & Hobbies" value={tree.personal.interests} onChange={(v) => setPersonal('interests', v)} placeholder="Hiking, photography, open source…" multiline />
                <InlineField label="Languages Spoken" value={tree.personal.languages} onChange={(v) => setPersonal('languages', v)} placeholder="English (native), Spanish (conversational)…" />
                <InlineField label="Core Values" value={tree.personal.values} onChange={(v) => setPersonal('values', v)} placeholder="Transparency, curiosity, craftsmanship…" multiline />
                <InlineField label="Fun Facts" value={tree.personal.funFacts} onChange={(v) => setPersonal('funFacts', v)} placeholder="I've visited 20 countries…" multiline />
                <InlineField label="Personality / MBTI" value={tree.personal.personalityType} onChange={(v) => setPersonal('personalityType', v)} placeholder="INFJ, Enneagram 5…" />
              </div>
            </Section>
          </motion.div>

          {/* ── Goals ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Target} title="Goals">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InlineField label="Short-term Goals" value={tree.goals.shortTerm} onChange={(v) => setGoal('shortTerm', v)} placeholder="Ship my SaaS by Q2…" multiline />
                <InlineField label="Long-term Goals" value={tree.goals.longTerm} onChange={(v) => setGoal('longTerm', v)} placeholder="Build a profitable indie business…" multiline />
                <InlineField label="Currently Learning" value={tree.goals.currentlyLearning} onChange={(v) => setGoal('currentlyLearning', v)} placeholder="Rust, system design, ML…" />
                <InlineField label="Open To" value={tree.goals.openTo} onChange={(v) => setGoal('openTo', v)} placeholder="Freelance, full-time, co-founder…" />
              </div>
            </Section>
          </motion.div>

          {/* ── Custom Fields ── */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } }}>
            <Section icon={Plus} title="Custom Fields" count={tree.custom.length} defaultOpen={false}>
              <p className="text-sm text-gray-400 -mt-2">Add any field you want — BaseStack will include it when generating your site.</p>
              <AnimatePresence>
                {tree.custom.map((field) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start gap-2 border border-gray-100 rounded-2xl px-4 py-3"
                  >
                    <div className="flex-1 grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <input
                          value={field.key}
                          onChange={(e) => setCustom(field.id, 'key', e.target.value)}
                          placeholder="Field name"
                          className="w-full bg-transparent text-sm font-medium text-gray-700 placeholder:text-gray-300 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          value={field.value}
                          onChange={(e) => setCustom(field.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-full bg-transparent text-sm text-gray-600 placeholder:text-gray-300 outline-none"
                        />
                      </div>
                    </div>
                    <button onClick={() => delCustom(field.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <AddButton label="Add Custom Field" onClick={addCustom} />
            </Section>
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/generate')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
            >
              <Sparkles className="w-4 h-4" />
              Generate Site with This Data
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Dashboard
            </a>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Tree
          </button>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showWelcome && (
          <DataTreeWelcomeModal onClose={closeWelcome} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLinkedIn && (
          <LinkedInModal
            onClose={() => setShowLinkedIn(false)}
            onApply={applyLinkedIn}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DataTreeDeleteModal
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteTree}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
