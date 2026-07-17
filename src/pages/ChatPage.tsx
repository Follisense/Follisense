import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Leaf, Paperclip, X, AlertCircle, Menu,
  Plus, Clock, Sparkles, MessageCircle, TrendingUp,
  Zap, ShieldCheck, Star, Check, Smartphone,
  CreditCard, Lock, ChevronRight, ArrowRight, Trash2,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabaseClient';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useSubscription } from '@/hooks/useSubscription';
import wordmarkGreen from '@/assets/wordmark-green.png';

const T = {
  bg: '#0E0D0B', surface: '#181614', card: '#1F1C19', border: '#2E2A24',
  gold: '#8FB29E', goldLt: '#B5CFC0', goldDim: 'rgba(143,178,158,0.15)',
  white: '#F5EFE6', muted: 'rgba(245,239,230,0.45)', dim: 'rgba(245,239,230,0.18)',
  green: '#4CAF50', blue: '#4F8EF7',
};
// v1 launch: subscriptions hidden — chat is unlimited. Flip to true to re-enable the paywall.
const SHOW_SUBSCRIPTIONS = false;
interface StoredSession { id: string; title: string; date: string; preview: string; }
const SESSIONS_KEY = 'folli_sessions_v2';
const loadSessions = (): StoredSession[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch (e) { console.warn('loadSessions error', e); return []; }
};
const saveSessions = (s: StoredSession[]) => {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s.slice(0, 30))); }
  catch (e) { console.warn('saveSessions error', e); }
};

const PLANS = [
  { id: 'monthly', label: 'Monthly', priceKsh: 499,  period: 'per month', badge: null       },
  { id: 'yearly',  label: 'Yearly',  priceKsh: 3999, period: 'per year',  badge: 'Save 33%' },
];
const FEATS = [
  { icon: MessageCircle, text: 'Unlimited chats'              },
  { icon: Sparkles,      text: 'Personalised recommendations' },
  { icon: TrendingUp,    text: 'Progress tracking'            },
  { icon: Zap,           text: 'Routine gap analysis'         },
  { icon: ShieldCheck,   text: 'Clinical insights'            },
  { icon: Star,          text: 'Wishlist & history'           },
];
const fmtCard   = (v: string) => v.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19);
const fmtExpiry = (v: string) => v.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1/$2').slice(0,5);

// ── Subscription sheet ────────────────────────────────────────
interface SubSheetProps { onClose: () => void; onSuccess: () => void; }

const SubSheet = ({ onClose, onSuccess }: SubSheetProps) => {
  const { user } = useApp();
  const [plan,  setPlan]  = useState<'monthly'|'yearly'>('yearly');
  const [step,  setStep]  = useState<'plans'|'method'|'mpesa'|'card'|'polling'|'proc'>('plans');
  const [phone, setPhone] = useState('');
  const [pErr,  setPErr]  = useState('');
  const [cid,   setCid]   = useState('');
  const [poll,  setPoll]  = useState(0);
  const [num,   setNum]   = useState('');
  const [exp,   setExp]   = useState('');
  const [cvc,   setCvc]   = useState('');
  const [cname, setCname] = useState('');
  const [cErr,  setCErr]  = useState('');
  const p = PLANS.find(x => x.id === plan)!;

  const onSuccessRef = useRef(onSuccess);
  const userIdRef    = useRef(user?.id);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  useEffect(() => {
    if (step !== 'polling' || !cid) return;
    // Stop after 6 polls (30 seconds),sandbox is slow
    if (poll > 6) { setStep('mpesa'); setPErr('No response. Please try again.'); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/api/mpesa/status?checkout_request_id=${cid}&user_id=${userIdRef.current}`);
        const d = await r.json();
        if (d.status === 'paid') onSuccessRef.current();
        else if (d.status === 'failed') setStep('mpesa');
        else setPoll(n => n + 1);
      } catch (e) {
        console.warn('mpesa poll error', e);
        setPoll(n => n + 1);
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [step, cid, poll]);

  const doMpesa = async () => {
    setPErr('');
    const c = phone.replace(/\s/g, '');
    if (!/^(07|01|\+?2547|\+?2541)\d{8}$/.test(c)) { setPErr('Enter a valid Safaricom number'); return; }
    setStep('polling');
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/api/mpesa/stk-push`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: c, amount: p.priceKsh, user_id: user?.id, plan }),
      });
      const d = await r.json();
      if (!d.success) { setPErr(d.error || 'Failed'); setStep('mpesa'); return; }
      setCid(d.checkout_request_id); setPoll(0);
    } catch (e) { console.warn('doMpesa error', e); setPErr('Network error'); setStep('mpesa'); }
  };

  const doCard = async () => {
  setCErr('');
  if (!num || !exp || !cvc || !cname) { setCErr('Fill in all card details'); return; }
  
  setStep('proc');
  
  try {
    const r = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/flutterwave-charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: p.priceKsh,
        user_id: user?.id,
        plan,
        cardNumber: num,
        expiryDate: exp,
        cvv: cvc,
        cardName: cname,
      }),
    });

    const d = await r.json();
    
    if (!d.success) {
      setCErr(d.error || 'Payment failed');
      setStep('card');
      return;
    }

    onSuccess();
  } catch (e) {
    console.error('doCard error', e);
    setCErr('Payment error. Please try again.');
    setStep('card');
  }
};

  const inp: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 13px', borderRadius: 11,
    border: `1.5px solid ${T.border}`, background: T.card, color: T.white,
    fontFamily: 'DM Sans,sans-serif', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
        onClick={e => e.stopPropagation()}
        style={{ background: T.surface, borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 430, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: 34, height: 4, background: T.border, borderRadius: 100, margin: '12px auto 0' }} />
        <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontFamily: 'Playfair Display,serif', fontSize: 19, color: T.white, margin: 0 }}>
            {step === 'plans' ? 'Upgrade to Pro' : step === 'method' ? 'Choose payment' : step === 'mpesa' || step === 'polling' ? 'M-Pesa' : 'Card payment'}
          </p>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: T.card, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={12} color={T.muted} />
          </button>
        </div>

        <div style={{ padding: '0 18px 36px' }}>
          {step === 'plans' && (<>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {FEATS.map((f, i) => { const Icon = f.icon; return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 100, padding: '3px 9px' }}>
                  <Icon size={9} color={T.gold} strokeWidth={2} />
                  <span style={{ color: T.white, fontFamily: 'DM Sans,sans-serif', fontSize: 10, fontWeight: 500 }}>{f.text}</span>
                </div>
              ); })}
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 11, padding: 3, display: 'flex', gap: 3, marginBottom: 9 }}>
              {PLANS.map(x => { const sel = plan === x.id; return (
                <button key={x.id} onClick={() => setPlan(x.id as 'monthly' | 'yearly')}
                  style={{ flex: 1, height: 34, borderRadius: 8, border: 'none', background: sel ? T.gold : 'transparent', color: sel ? '#1C1200' : T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, fontWeight: sel ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {x.label}
                  {x.badge && <span style={{ background: sel ? 'rgba(0,0,0,0.18)' : T.goldDim, color: sel ? '#1C1200' : T.gold, fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 100 }}>{x.badge}</span>}
                </button>
              ); })}
            </div>
            <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '11px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'Playfair Display,serif', fontSize: 24, fontWeight: 600, color: T.white }}>{p.priceKsh.toLocaleString()}</span>
                <span style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 11, marginLeft: 4 }}>KSh · {p.period}</span>
              </div>
              {plan === 'yearly' && <div style={{ textAlign: 'right' }}><p style={{ color: T.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600, margin: 0 }}>~333/mo</p><p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 10, margin: '1px 0 0' }}>vs 499 monthly</p></div>}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('method')}
              style={{ width: '100%', height: 48, borderRadius: 13, background: `linear-gradient(135deg,${T.gold},${T.goldLt})`, color: '#1C1200', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 7 }}>
              Get Pro · KSh {p.priceKsh.toLocaleString()} <ArrowRight size={14} strokeWidth={2.5} />
            </motion.button>
            <p style={{ color: T.dim, fontFamily: 'DM Sans,sans-serif', fontSize: 11, textAlign: 'center' }}>Cancel anytime · Secure</p>
          </>)}

          {step === 'method' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <button onClick={() => setStep('plans')} style={{ background: 'none', border: 'none', color: T.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 12, cursor: 'pointer', padding: '0 0 11px' }}>← Back</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { id: 'mpesa', l: 'M-Pesa',     s: 'Lipa Na M-Pesa',    c: T.green, bg: 'rgba(76,175,80,0.12)',  Icon: Smartphone },
                  { id: 'card',  l: 'Visa / Card', s: 'Encrypted payment', c: T.blue,  bg: 'rgba(79,142,247,0.12)', Icon: CreditCard  },
                ].map(m => (
                  <motion.button key={m.id} whileTap={{ scale: 0.98 }} onClick={() => setStep(m.id as 'mpesa' | 'card')}
                    style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 13, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', width: '100%' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><m.Icon size={15} color={m.c} strokeWidth={1.8} /></div>
                    <div style={{ flex: 1, textAlign: 'left' }}><p style={{ color: T.white, fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, margin: '0 0 1px' }}>{m.l}</p><p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 11, margin: 0 }}>{m.s}</p></div>
                    <ChevronRight size={12} color={T.dim} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {(step === 'mpesa' || step === 'polling') && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {step === 'mpesa' && <button onClick={() => setStep('method')} style={{ background: 'none', border: 'none', color: T.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 12, cursor: 'pointer', padding: '0 0 11px' }}>← Back</button>}
              {step === 'polling' ? (
                <div style={{ textAlign: 'center', padding: '14px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 42, height: 42, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.gold}`, margin: '0 auto 11px' }} />
                  <p style={{ color: T.white, fontFamily: 'Playfair Display,serif', fontSize: 15, marginBottom: 5 }}>Check your phone</p>
                  <p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, lineHeight: 1.6 }}>Prompt sent to <strong style={{ color: T.white }}>{phone}</strong>. Enter your PIN.</p>
                </div>
              ) : (<>
                <p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, marginBottom: 5 }}>Safaricom number</p>
                <div style={{ position: 'relative', marginBottom: pErr ? 7 : 11 }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 500 }}>+254</span>
                  <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setPErr(''); }} placeholder="712 345 678" maxLength={10}
                    style={{ ...inp, height: 48, paddingLeft: 60 }} />
                </div>
                {pErr && <p style={{ color: '#E53935', fontFamily: 'DM Sans,sans-serif', fontSize: 11, marginBottom: 7 }}>{pErr}</p>}
                <div style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 9, padding: '7px 11px', marginBottom: 11 }}>
                  <p style={{ color: '#81C784', fontFamily: 'DM Sans,sans-serif', fontSize: 11, lineHeight: 1.6, margin: 0 }}>💚 A prompt will appear on your phone. Enter your M-Pesa PIN.</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={doMpesa}
                  style={{ width: '100%', height: 46, borderRadius: 12, background: T.gold, color: '#1C1200', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Send Prompt · KSh {p.priceKsh.toLocaleString()}
                </motion.button>
              </>)}
            </motion.div>
          )}

          {(step === 'card' || step === 'proc') && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {step === 'card' && <button onClick={() => setStep('method')} style={{ background: 'none', border: 'none', color: T.gold, fontFamily: 'DM Sans,sans-serif', fontSize: 12, cursor: 'pointer', padding: '0 0 11px' }}>← Back</button>}
              {step === 'proc' ? (
                <div style={{ textAlign: 'center', padding: '14px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 42, height: 42, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.gold}`, margin: '0 auto 11px' }} />
                  <p style={{ color: T.white, fontFamily: 'Playfair Display,serif', fontSize: 15, margin: 0 }}>Processing...</p>
                </div>
              ) : (<>
                <p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, marginBottom: 5 }}>Card number</p>
                <input type="text" value={num} onChange={e => setNum(fmtCard(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} style={{ ...inp, marginBottom: 7 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 7 }}>
                  {[
                    { l: 'Expiry', v: exp, s: (v: string) => setExp(fmtExpiry(v)), ph: 'MM/YY', m: 5 },
                    { l: 'CVC',    v: cvc, s: (v: string) => setCvc(v.replace(/\D/g,'').slice(0,4)), ph: '123', m: 4 },
                  ].map(f => (
                    <div key={f.l}>
                      <p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, marginBottom: 4 }}>{f.l}</p>
                      <input type="text" value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.ph} maxLength={f.m} style={inp} />
                    </div>
                  ))}
                </div>
                <p style={{ color: T.muted, fontFamily: 'DM Sans,sans-serif', fontSize: 12, marginBottom: 4 }}>Name on card</p>
                <input type="text" value={cname} onChange={e => setCname(e.target.value)} placeholder="JANE DOE" style={{ ...inp, marginBottom: cErr ? 7 : 11 }} />
                {cErr && <p style={{ color: '#E53935', fontFamily: 'DM Sans,sans-serif', fontSize: 11, marginBottom: 7 }}>{cErr}</p>}
                <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Lock size={10} color={T.blue} /><p style={{ color: '#90B8F8', fontFamily: 'DM Sans,sans-serif', fontSize: 11, margin: 0 }}>Encrypted · Never stored</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={doCard}
                  style={{ width: '100%', height: 46, borderRadius: 12, background: T.gold, color: '#1C1200', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Pay KSh {p.priceKsh.toLocaleString()}
                </motion.button>
              </>)}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Types ─────────────────────────────────────────────────────
interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; }
interface UserProfile {
  full_name?: string;
  // from hair_info table
  hair_type?: string;
  hair_subtype?: string;
  top_concerns?: string[];
  current_styles?: string[];
  protective_style_frequency?: string;
  chemical_processing?: string;
  // from consumer_profiles table
  consumer?: {
    hair_texture?: string;
    current_styles?: string[];
    protective_style_frequency?: string;
    top_concerns?: string[];
  } | null;
}
interface ChatMemory {
  summary: string | null;
  last_concern: string | null;
  last_topic: string | null;
  chat_count: number;
  session_count: number;
  last_seen_at: string | null;
}

// ── Sub-components ────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex justify-start">
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
      <Leaf size={14} className="text-primary" />
    </div>
    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 rounded-full bg-gray-400"
          animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  </div>
);

const Bubble = ({ msg, isNew }: { msg: Message; isNew?: boolean }) => {
  if (msg.role === 'system') return null;
  return (
    <motion.div initial={isNew ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'assistant' && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <Leaf size={14} className="text-primary" />
        </div>
      )}
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
        {msg.role === 'assistant' ? (
          <ReactMarkdown components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
            li: ({ children }) => <li className="flex items-start gap-1.5"><span className="text-primary mt-1 text-xs flex-shrink-0">•</span><span>{children}</span></li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          }}>{msg.content}</ReactMarkdown>
        ) : msg.content}
      </div>
    </motion.div>
  );
};

// ── Main ChatPage ─────────────────────────────────────────────
const ChatPage = () => {
  // ── ALL hooks at the top, unconditionally, fixed order ──────
 const { userName, user } = useApp();
  const authLoading = false; 
  const {
    isPro,
    chatLimitReached,
    chatsRemaining,
    loading: subLoading,
    incrementChatCount,
  } = useSubscription(user?.id,{authLoading}); 

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [memory,      setMemory]      = useState<ChatMemory | null>(null);
  const [memLoaded,   setMemLoaded]   = useState(false);
  const [file,        setFile]        = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [newIds,      setNewIds]      = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions,    setSessions]    = useState<StoredSession[]>([]);
  const [showSub,     setShowSub]     = useState(false);
  const [subOk,       setSubOk]       = useState(false);
  const [sid,         setSid]         = useState<Id<'chatSessions'> | null>(null);

  const endRef  = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Convex hooks,must also be unconditional ───────────────
  const createSession = useMutation(api.chat.createSession);
  const saveTitle     = useMutation(api.chat.saveSessionTitle);
  const sendAction    = useAction(api.chatAction.sendMessage);
  const genUploadUrl  = useMutation(api.files.generateUploadUrl);

  // ── Effects ─────────────────────────────────────────────────
  useEffect(() => { setSessions(loadSessions()); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: au } } = await supabase.auth.getUser();
        if (!au) { setMemLoaded(true); return; }

        const [{ data: pr }, { data: hi }, { data: co }, { data: mem }] = await Promise.all([
          // profiles table,only select columns that actually exist there
          supabase.from('profiles').select('full_name').eq('id', au.id).maybeSingle(),
          // hair_info table,hair type, concerns etc
          supabase.from('hair_info').select('hair_type,hair_subtype,top_concerns,current_styles,protective_style_frequency,chemical_processing').eq('user_id', au.id).maybeSingle(),
          // consumer_profiles table
          supabase.from('consumer_profiles').select('hair_texture,current_styles,protective_style_frequency,top_concerns').eq('user_id', au.id).maybeSingle(),
          // chat memory
          supabase.from('chat_memory').select('*').eq('user_id', au.id).maybeSingle(),
        ]);

        setProfile({
          full_name:                   pr?.full_name,
          hair_type:                   hi?.hair_type,
          hair_subtype:                hi?.hair_subtype,
          top_concerns:                hi?.top_concerns,
          current_styles:              hi?.current_styles,
          protective_style_frequency:  hi?.protective_style_frequency,
          chemical_processing:         hi?.chemical_processing,
          consumer:                    co ?? null,
        });
        setMemory(mem ?? null);

        if (mem) {
          supabase.from('chat_memory')
            .update({ last_seen_at: new Date().toISOString(), session_count: (mem.session_count ?? 0) + 1 })
            .eq('user_id', au.id)
            .then(() => {}, (e: unknown) => console.warn('memory update error', e));
        }
      } catch (e) {
        console.warn('profile load error', e);
      } finally {
        setMemLoaded(true);
      }
    };
    load();
  }, []);

  const startSession = useCallback(async () => {
    const id = await createSession({});
    setSid(id);
    setMessages([]);
    setError(null);
  }, [createSession]);

  useEffect(() => { startSession(); }, [startSession]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const saveMemory = useCallback(async (userMsg: string) => {
    try {
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au) return;
      const t = userMsg.toLowerCase();
      let topic = 'general';
      if (['itch', 'flak', 'sore', 'rash'].some(w => t.includes(w)))     topic = 'symptom';
      else if (['wash', 'routine', 'shampoo'].some(w => t.includes(w)))   topic = 'routine';
      else if (['thin', 'edge', 'bald', 'loss'].some(w => t.includes(w))) topic = 'thinning';
      const lc    = userMsg.length > 80 ? userMsg.slice(0, 80) + '…' : userMsg;
      const prev  = memory?.summary ?? '';
      const lines = prev.split('\n').filter(Boolean).slice(-2);
      lines.push(`[${new Date().toLocaleDateString()}] ${lc}`);
      const ns = lines.join('\n');
      const ex = await supabase.from('chat_memory').select('id,chat_count').eq('user_id', au.id).maybeSingle();
      if (ex.data) {
        await supabase.from('chat_memory').update({ summary: ns, last_concern: lc, last_topic: topic, chat_count: (ex.data.chat_count ?? 0) + 1, last_seen_at: new Date().toISOString() }).eq('user_id', au.id);
      } else {
        await supabase.from('chat_memory').insert({ user_id: au.id, summary: ns, last_concern: lc, last_topic: topic, chat_count: 1, session_count: 1, last_seen_at: new Date().toISOString() });
      }
      setMemory(prev => ({ ...prev!, summary: ns, last_concern: lc, last_topic: topic, chat_count: (prev?.chat_count ?? 0) + 1 }));
    } catch (e) {
      console.warn('saveMemory error', e);
    }
  }, [memory]);

  const displayName  = profile?.full_name?.split(' ')[0] ?? userName ?? 'there';
  const isReturning  = (memory?.session_count ?? 0) > 0;
  const userMsgCount = messages.filter(m => m.role === 'user').length;

  const starters = isReturning
    ? [
        memory?.last_concern ? `Any updates on "${memory.last_concern.slice(0, 40)}…"?` : null,
        'How has my scalp been feeling lately?',
        'I want to review my current routine',
        'Something new has come up with my hair',
      ].filter((s): s is string => s !== null)
    : [
        'My scalp has been really itchy lately 🌿',
        "I'm worried about my edges thinning",
        'How often should I wash in a protective style?',
        'What should I eat for healthier hair?',
      ];

  const send = async (text: string) => {
    if (SHOW_SUBSCRIPTIONS && chatLimitReached && !isPro) return;
    if ((!text.trim() && !file) || isTyping || !sid) return;

    setError(null); setIsTyping(true); setUploading(!!file);

    let storageId: string | null = null;
    if (file) {
      try {
        const url = await genUploadUrl();
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) throw new Error('upload failed');
        const { storageId: uid } = await res.json() as { storageId: string };
        storageId = uid;
      } catch (e) {
        console.warn('file upload error', e);
        setError('Upload failed.'); setUploading(false); setIsTyping(false); return;
      }
    }

    const content = text.trim() || (file?.type.startsWith('image/') ? '📸 Shared a photo' : '📄 Shared a file');
    const msgId   = `user-${Date.now()}`;
    const userMsg: Message = { id: msgId, role: 'user', content };

    setMessages(p => [...p, userMsg]);
    setNewIds(p => new Set(p).add(msgId));
    setInput(''); setFile(null);

    if (userMsgCount === 0 && sid) {
      const title   = content.length > 42 ? content.slice(0, 42) + '…' : content;
      const ns: StoredSession = { id: sid, title, date: new Date().toISOString(), preview: content };
      const updated = [ns, ...sessions.filter(s => s.id !== sid)];
      setSessions(updated); saveSessions(updated);
      saveTitle({ sessionId: sid, title })
        .then(() => {})
        .catch((e: unknown) => console.warn('saveTitle error', e));
    }

    try {
      const history = [...messages]
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

      const reply = await sendAction({
        sessionId:          sid,
        messages:           [...history, { role: 'user' as const, content }],
        fileStorageId:      storageId ?? undefined,
        fileType:           file?.type ?? undefined,
        userProfile:        (profile ?? {}) as Record<string, unknown>,
        conversationLength: userMsgCount,
        chatMemory:         memory ?? null,
      });

      const aid = `assistant-${Date.now()}`;
      setMessages(p => [...p, { id: aid, role: 'assistant', content: reply }]);
      setNewIds(p => new Set(p).add(aid));
      incrementChatCount();
      await saveMemory(content);
    } catch (e) {
      console.warn('send error', e);
      setMessages(p => [...p, { id: `err-${Date.now()}`, role: 'assistant', content: "I'm having trouble right now. Please try again." }]);
    } finally { setIsTyping(false); setUploading(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const visible = messages.filter(m => m.role !== 'system');

  return (
    <div className="flex flex-col" style={{ position: 'relative', overflow: 'hidden', background: '#FFFFFF', height: '100dvh' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #F0EDE9', background: '#fff', gap: 10 }}>
        <button onClick={() => setSidebarOpen(true)}
          style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F2EF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Menu size={18} color="#555" strokeWidth={1.8} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <img src={wordmarkGreen} alt="Folli" style={{ height: 20, objectFit: 'contain' }} />
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#999', margin: 0 }}>Your hair & scalp assistant</p>
        </div>
        <button onClick={startSession}
          style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F2EF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={17} color="#555" strokeWidth={2} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {visible.length === 0 && memLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-5">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 overflow-hidden">
              <img src="/follisense-icon-green.png" alt="Folli" style={{ width: 56, height: 56, objectFit: 'contain' }} />
            </div>
            {isReturning ? (<>
              <p className="text-base font-semibold">Welcome back, {displayName}!</p>
              {memory?.last_concern && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs mx-auto">
                  Last time: <span className="text-foreground font-medium">"{memory.last_concern.slice(0, 55)}{memory.last_concern.length > 55 ? '…' : ''}"</span>
                </p>
              )}
              {memory?.last_seen_at && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Clock size={10} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{new Date(memory.last_seen_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
              )}
              {isPro && memory?.summary && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="mx-auto mt-3 max-w-xs bg-primary/5 border border-primary/10 rounded-2xl px-3 py-2.5 text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={10} className="text-primary" />
                    <p className="text-xs font-semibold text-primary">Folli remembers</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{memory.summary.split('\n').slice(-1)[0]?.replace(/\[.*?\]\s*/, '')}</p>
                </motion.div>
              )}
            </>) : (<>
              <p className="text-base font-semibold">Hi {displayName}!</p>
              <p className="text-xs text-muted-foreground mt-1">I'm Folli,I'll ask questions first to understand your situation before giving advice.</p>
            </>)}
            <div className="mt-4 flex flex-col gap-2">
              {isReturning && <p className="text-xs text-muted-foreground font-medium">Continue where you left off:</p>}
              {starters.slice(0, 3).map((q, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 * i }}
                  onClick={() => send(q)} disabled={chatLimitReached && !isPro}
                  className="text-left px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-40">
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {!memLoaded && visible.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-[2.5px] border-primary border-t-transparent animate-spin" />
          </div>
        )}

        <AnimatePresence>
          {visible.map(m => <Bubble key={m.id} msg={m} isNew={newIds.has(m.id)} />)}
        </AnimatePresence>
        <AnimatePresence>
          {isTyping && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><TypingDots /></motion.div>}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 flex-1">{error}</p>
              <button onClick={() => setError(null)}><X size={13} className="text-red-400" /></button>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* File preview */}
      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <span className="text-base">{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
              <span className="text-xs font-medium truncate flex-1">{file.name}</span>
              <button onClick={() => setFile(null)}><X size={14} className="text-muted-foreground" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low messages warning */}
    {SHOW_SUBSCRIPTIONS && !isPro && !subLoading && !chatLimitReached && chatsRemaining <= 2 && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#999', padding: '3px 0 2px' }}>
          {chatsRemaining} message{chatsRemaining !== 1 ? 's' : ''} left ·{' '}
          <button onClick={() => setShowSub(true)} style={{ background: 'none', border: 'none', color: '#D4A866', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 11 }}>Upgrade</button>
        </p>
      )}

      {/* Gate OR input */}
      {SHOW_SUBSCRIPTIONS && chatLimitReached && !isPro ? (
        <div style={{ margin: '0 16px 16px', borderRadius: 18, background: 'linear-gradient(135deg,#2B1F14,#1C1C1C)', padding: '18px 20px', textAlign: 'center', border: '1.5px solid rgba(212,168,102,0.4)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,168,102,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontSize: 24, marginBottom: 8 }}>💬</p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, color: '#F5EFE6', marginBottom: 5 }}>Free limit reached</p>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 11, color: 'rgba(245,239,230,0.55)', lineHeight: 1.6, marginBottom: 14 }}>5 free messages per month. Go unlimited with Pro.</p>
          <button onClick={() => setShowSub(true)}
            style={{ width: '100%', height: 44, borderRadius: 12, background: '#D4A866', color: '#1C1200', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 6 }}>
            Upgrade to Pro →
          </button>
          <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: 'rgba(245,239,230,0.3)', margin: 0 }}>From KSh 499/month · Cancel anytime</p>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-4 py-3 bg-white" style={{ paddingBottom: 'calc(12px + 64px + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={isTyping || uploading}
              className="w-11 h-11 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 disabled:opacity-40">
              <Paperclip size={18} />
            </button>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 15 * 1024 * 1024) { setError('File too large (max 15MB)'); return; }
                setFile(f); e.target.value = '';
              }} />
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={file ? 'Add message (optional)...' : 'Ask about your scalp or hair...'}
              disabled={isTyping || uploading}
              className="flex-1 h-11 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:border-primary text-sm disabled:opacity-50" />
            <button onClick={() => send(input)} disabled={(!input.trim() && !file) || isTyping || uploading}
              className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all">
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 140 }}
            onClick={() => setSidebarOpen(false)} />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: '#fff', zIndex: 150, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '52px 16px 14px', borderBottom: '1px solid #F0EDE9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontFamily: 'Playfair Display,serif', fontSize: 17, fontWeight: 600, color: '#1C1C1C', margin: 0 }}>Chats</p>
                <button onClick={() => setSidebarOpen(false)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5F2EF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={13} color="#777" />
                </button>
              </div>
              <button onClick={() => { startSession(); setSidebarOpen(false); }}
                style={{ width: '100%', height: 40, borderRadius: 11, background: 'var(--primary,#4A7C6F)', color: '#fff', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={14} strokeWidth={2.5} /> New chat
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                  <MessageCircle size={26} color="#DDD" strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 12, color: '#BBB', lineHeight: 1.5 }}>No past chats yet.</p>
                </div>
              ) : sessions.map(s => {
                const active = s.id === sid;
                return (
                  <button key={s.id}
                    onClick={() => { setSid(s.id as Id<'chatSessions'>); setMessages([]); setError(null); setSidebarOpen(false); }}
                    style={{ width: '100%', background: active ? 'rgba(74,124,111,0.08)' : 'transparent', border: active ? '1.5px solid rgba(74,124,111,0.2)' : '1.5px solid transparent', borderRadius: 11, padding: '9px 11px', marginBottom: 3, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
                    <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: active ? 600 : 400, color: '#1C1C1C', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={9} color="#BBB" />
                      <p style={{ fontFamily: 'DM Sans,sans-serif', fontSize: 10, color: '#BBB', margin: 0 }}>
                        {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {sessions.length > 0 && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid #F0EDE9' }}>
                <button onClick={() => { saveSessions([]); setSessions([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontFamily: 'DM Sans,sans-serif', fontSize: 11, padding: '4px 0' }}>
                  <Trash2 size={11} /> Clear all chats
                </button>
              </div>
            )}
          </motion.div>
        </>)}
      </AnimatePresence>

      {/* Sub sheet */}
      <AnimatePresence>
        {showSub && <SubSheet onClose={() => setShowSub(false)} onSuccess={() => { setShowSub(false); setSubOk(true); }} />}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {subOk && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: 'linear-gradient(135deg,#2B1F14,#1C1C1C)', border: '1.5px solid rgba(212,168,102,0.5)', borderRadius: 14, padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 9, width: 'calc(100% - 32px)', maxWidth: 380 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(212,168,102,0.2)', border: '1.5px solid #D4A866', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={12} color="#D4A866" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#F5EFE6', fontFamily: 'DM Sans,sans-serif', fontSize: 13, fontWeight: 600, margin: 0 }}>You're Pro now! 🎉</p>
              <p style={{ color: 'rgba(245,239,230,0.5)', fontFamily: 'DM Sans,sans-serif', fontSize: 11, margin: '1px 0 0' }}>Unlimited chats unlocked</p>
            </div>
            <button onClick={() => setSubOk(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={12} color="rgba(245,239,230,0.4)" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;