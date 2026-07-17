import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, ExternalLink, Eye, Search as SearchIcon, CheckCircle2, XCircle, ImageIcon } from 'lucide-react';
import { consumerConditions, ConsumerCondition } from '@/data/conditionGuide';
import { stylistConditions, getConditionById as getStylistCondition } from '@/data/stylistConditions';
import ScalpIllustration from '@/components/ScalpIllustration';

const ConditionDetail = ({ condition, onBack }: { condition: ConsumerCondition; onBack: () => void }) => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const stylistCond = getStylistCondition(condition.id);

  const yesCount = Object.values(answers).filter(Boolean).length;
  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === condition.selfCheck.length;

  const getResultMessage = () => {
    if (yesCount <= 1) return { text: `This probably isn't ${condition.name}, but if you're concerned, it's always worth checking.`, color: 'text-primary', bg: 'bg-sage-light' };
    if (yesCount < condition.selfCheck.length) return { text: `Some of what you're describing is consistent with ${condition.name}. Consider mentioning it at your next check-in or speaking to a professional.`, color: 'text-warning', bg: 'bg-warning/10' };
    return { text: `What you're describing sounds like it could be ${condition.name}. We'd recommend seeing a trichologist or dermatologist. The earlier it's assessed, the more options you'll have.`, color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 btn-press">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-xl font-semibold text-foreground mb-1">{condition.name}</h2>
      <p className="text-sm text-muted-foreground mb-6">{condition.summary}</p>

      {/* Section 1: What is it? */}
      <div className="card-elevated p-5 mb-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">What is it?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{condition.whatIsIt}</p>
      </div>

      {/* Section 2: Photo gallery,styled placeholders */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">What does it look like?</h3>
        <p className="text-xs text-muted-foreground mb-3">Reference photos on textured hair and darker skin tones</p>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {condition.photoGallery.map((photo, i) => (
            <div key={i} className="flex-shrink-0 w-[200px]">
              <div
                className="w-[200px] h-[160px] rounded-2xl mb-2 flex flex-col items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #f0ece8 0%, #e8e2db 100%)',
                  border: '1.5px solid #e0d8d0',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(127, 168, 150, 0.15)' }}
                >
                  <ImageIcon size={20} style={{ color: '#7fa896' }} />
                </div>
                <p className="text-[10px] text-center px-4 leading-snug" style={{ color: '#9a8f87' }}>
                  {photo.description}
                </p>
                <span
                  className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(127,168,150,0.15)', color: '#7fa896' }}
                >
                  Photo coming soon
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">{photo.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Illustrated diagrams */}
      {stylistCond && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Illustrated guide</h3>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {stylistCond.stages.map((stage, i) => (
              <div key={i} className="flex-shrink-0 w-[160px]">
                <div className="w-[160px] h-[160px] rounded-xl overflow-hidden mb-2">
                  <ScalpIllustration conditionId={condition.id} stageIndex={i} />
                </div>
                <p className="text-xs font-medium text-foreground">{stage.label}</p>
                <p className="text-[11px] text-muted-foreground">{stage.annotation}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-secondary/60 border border-secondary p-4 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-primary" />
              <h4 className="text-xs font-semibold text-foreground">How it presents on darker skin</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{stylistCond.darkerSkinNote}</p>
          </div>
        </div>
      )}

      {/* Section 3: Self-check */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Could this be what I'm seeing?</h3>
        <div className="space-y-3">
          {condition.selfCheck.map((q, i) => (
            <div key={i} className="card-elevated p-4">
              <p className="text-sm text-foreground mb-3">{q.question}</p>
              <div className="flex gap-2">
                <button onClick={() => setAnswers(prev => ({ ...prev, [i]: true }))} className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${answers[i] === true ? 'border-primary bg-sage-light text-primary' : 'border-border text-muted-foreground'}`}>Yes</button>
                <button onClick={() => setAnswers(prev => ({ ...prev, [i]: false }))} className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${answers[i] === false ? 'border-primary bg-sage-light text-primary' : 'border-border text-muted-foreground'}`}>No</button>
              </div>
            </div>
          ))}
        </div>

        {allAnswered && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 mt-4 ${getResultMessage().bg}`}>
            <p className={`text-sm leading-relaxed ${getResultMessage().color}`}>{getResultMessage().text}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => navigate('/find-specialist')} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium btn-press">Find a specialist</button>
              <button onClick={() => navigate('/wash-day')} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground btn-press">Log a check-in</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Section 4: What can I do? */}
      <div className="card-elevated p-5 mb-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">What can I do?</h3>
        <ul className="space-y-2 mb-4">
          {condition.actionSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
        <h4 className="text-xs font-semibold text-foreground mb-2">What NOT to do</h4>
        <ul className="space-y-2 mb-4">
          {condition.dontDo.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <XCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <h4 className="text-xs font-semibold text-foreground mb-2">When to see someone</h4>
        <p className="text-sm text-muted-foreground">{condition.whenToSee}</p>
      </div>

      {/* Section 5: Learn more */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Learn more</h3>
        {condition.relatedArticleId && (
          <button onClick={() => navigate(`/learn?article=${condition.relatedArticleId}`)} className="card-elevated p-4 w-full text-left flex items-center gap-3 btn-press">
            <div className="flex-1"><p className="text-sm font-medium text-foreground">Read the full article</p></div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        )}
        <a href={condition.externalLinkUrl} target="_blank" rel="noopener noreferrer" className="card-elevated p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{condition.externalLinkLabel}</p>
            <p className="text-xs text-muted-foreground">Opens in your browser, you will leave the app</p>
          </div>
          <ExternalLink size={14} className="text-muted-foreground" />
        </a>
        <a href={condition.dermnetUrl} target="_blank" rel="noopener noreferrer" className="card-elevated p-4 flex items-center gap-3">
          <div className="flex-1"><p className="text-sm font-medium text-foreground">DermNet NZ, Clinical reference</p><p className="text-xs text-muted-foreground">Opens in your browser</p></div>
          <ExternalLink size={14} className="text-muted-foreground" />
        </a>
      </div>

      <div className="pt-4 border-t border-border mb-20">
        <button onClick={onBack} className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium text-sm btn-press flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </motion.div>
  );
};

const ConditionGuidePage = ({ onBack }: { onBack: () => void }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? consumerConditions.find(c => c.id === selectedId) : null;

  if (selected) {
    return <ConditionDetail condition={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 btn-press">
        <ArrowLeft size={16} /> Back to Learn
      </button>

      <h2 className="text-lg font-semibold text-foreground mb-1">What does that look like?</h2>
      <p className="text-sm text-muted-foreground mb-5">A visual guide to common scalp and hair conditions</p>

      <div className="rounded-xl bg-secondary/60 border border-secondary p-4 mb-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This guide is for awareness, not diagnosis. If anything here looks familiar, that's a reason to see a professional, not a reason to panic. Most scalp conditions are treatable, especially when caught early.
        </p>
      </div>

      <div className="space-y-2.5 mb-8">
        {consumerConditions.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)} className="card-elevated p-4 w-full text-left flex items-center gap-3 btn-press">
            <div className="w-10 h-10 rounded-xl bg-sage-light flex items-center justify-center flex-shrink-0">
              <SearchIcon size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">{c.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{c.summary}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-secondary/40 border border-secondary p-4 mb-6">
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          DermNet NZ is a free, trusted dermatology resource used by medical professionals worldwide. Images are provided for educational reference only.
        </p>
      </div>

      <div className="pt-4 border-t border-border mb-20">
        <button onClick={onBack} className="w-full h-12 rounded-xl border-2 border-border text-foreground font-medium text-sm btn-press flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Back to Learn
        </button>
      </div>
    </motion.div>
  );
};

export default ConditionGuidePage;