import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Camera, Check, ClipboardList } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

const styleOptions = [
  'Low cut / fade', 'Waves', 'Cornrows', 'Locs', 'Twists',
  'Braids', 'Afro', 'Bald / shaved', 'Weave / wig',
  'Silk press / blowout', 'Other',
];

const scalpIssueOptions = [
  'Itch', 'Tenderness', 'Flaking', 'Soreness',
  'Razor bumps / ingrown hairs', 'Thinning', 'None',
];

const washOptions = [
  'Today', 'Yesterday', '2–3 days ago', '4–7 days ago',
  'Over a week ago', 'Not sure',
];

const StylistQuickIntake = () => {
  const navigate = useNavigate();
  const { addClientObservation, clientObservations, stylistLocations } = useApp();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [clientName, setClientName]     = useState('');
  const [style, setStyle]               = useState('');
  const [otherStyle, setOtherStyle]     = useState('');
  const [lastWash, setLastWash]         = useState('');
  const [scalpIssues, setScalpIssues]   = useState<string[]>([]);
  const [attentionAreas, setAttentionAreas] = useState('');
  const [thinning, setThinning]         = useState('');
  const [photoTaken, setPhotoTaken]     = useState(false);

  const previousClients = useMemo(() => {
    const names = new Set<string>();
    clientObservations.forEach(o => names.add(o.clientName));
    return Array.from(names).sort();
  }, [clientObservations]);

  const toggleIssue = (issue: string) => {
    if (issue === 'None') {
      setScalpIssues(['None']);
    } else {
      setScalpIssues(prev => {
        const filtered = prev.filter(x => x !== 'None');
        return filtered.includes(issue) ? filtered.filter(x => x !== issue) : [...filtered, issue];
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return clientName.trim().length > 0;
      case 2: return style !== '' && (style !== 'Other' || otherStyle.trim()) && lastWash !== '';
      case 3: return scalpIssues.length > 0 && thinning !== '';
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const computeRisk = (): 'green' | 'amber' | 'red' => {
    if (scalpIssues.includes('None') && thinning === 'No') return 'green';
    if (thinning === 'Yes' || scalpIssues.length >= 3) return 'red';
    return 'amber';
  };

  const finalStyle = style === 'Other' ? otherStyle : style;

  const handleSave = () => {
    const loc = stylistLocations.find(l => l.isPrimary) || stylistLocations[0];
    const observations: string[] = [];
    if (scalpIssues.includes('None')) observations.push('General check, nothing concerning');
    else {
      scalpIssues.forEach(i => {
        if (i === 'Itch') observations.push('Scalp redness or irritation');
        else if (i === 'Tenderness' || i === 'Soreness') observations.push('Tender or sore areas');
        else if (i === 'Flaking') observations.push('Excessive flaking or buildup');
        else if (i === 'Razor bumps / ingrown hairs') observations.push('Bumps or lesions');
        else if (i === 'Thinning') observations.push('Thinning at crown or vertex');
      });
    }
    if (thinning === 'Yes') observations.push('Thinning at crown or vertex');
    const isReturning = previousClients.includes(clientName.trim());
    addClientObservation({
      id: `qi-${Date.now()}`,
      clientName: clientName.trim(),
      date: new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      observations: [...new Set(observations)],
      photos: photoTaken ? ['Pre-styling scalp'] : [],
      photoAreas: photoTaken ? ['General scalp'] : [],
      notes: `Quick intake,Style: ${finalStyle} | Last wash: ${lastWash}${attentionAreas ? ` | Attention areas: ${attentionAreas}` : ''} | Thinning: ${thinning}`,
      risk: computeRisk(),
      location: loc?.name,
      locationCity: loc?.city,
      service: finalStyle,
      clientType: isReturning ? 'returning' : 'new',
    });
    toast.success('Quick intake saved');
    navigate('/stylist');
  };

  const riskConfig = {
    green: { text: 'No concerns flagged',                   bg: 'rgba(127,168,150,0.1)',  color: '#3D6B56' },
    amber: { text: 'Some concerns noted,monitor',         bg: 'rgba(201,153,106,0.1)',  color: '#8A5C2A' },
    red:   { text: 'Significant concerns,consider referral', bg: 'rgba(201,112,112,0.1)', color: '#8A3030' },
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(https://i.pinimg.com/1200x/21/df/fe/21dffea6ca5d2c69edb5c8b926e41b50.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <style>{`
        .qi-sel-card { border: 1.5px solid #E8DDD2 !important; border-radius: 12px; padding: 12px; width: 100%; text-align: left; background: #fff; cursor: pointer; transition: border-color 0.15s; }
        .qi-sel-card.selected { border: 1.5px solid #7fa896 !important; background: rgba(127,168,150,0.04); }
        .qi-pill { border: 1.5px solid #E8DDD2 !important; border-radius: 100px; padding: 8px 16px; background: #fff; cursor: pointer; font-size: 0.875rem; transition: border-color 0.15s; }
        .qi-pill.selected { border: 1.5px solid #7fa896 !important; background: rgba(127,168,150,0.06); color: #3D6B56; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '560px' }}
      >
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '24px 36px 28px',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* ── Header with progress bars ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              onClick={() => step > 1 ? setStep(step - 1) : navigate('/stylist')}
              style={{ padding: '8px', marginLeft: '-8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={22} strokeWidth={1.8} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{
                  height: '6px', width: '32px', borderRadius: '100px',
                  backgroundColor: i < step ? '#7fa896' : '#e8e8e8',
                  transition: 'background-color 0.3s',
                }} />
              ))}
            </div>
            <button
              onClick={() => navigate('/stylist')}
              style={{ padding: '8px', marginRight: '-8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={22} strokeWidth={1.8} />
            </button>
          </div>

          {/* ── Step content ── */}
          <div style={{ overflowY: 'auto', maxHeight: '65vh' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                style={{ paddingTop: '8px', paddingBottom: '32px' }}
              >

                {/* STEP 1: Client name */}
                {step === 1 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <ClipboardList size={16} color="#7fa896" />
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7fa896' }}>
                        Quick Intake
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      Client name
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>
                      First name or initials only,no account needed
                    </p>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g., Ama or A.K."
                      autoFocus
                      style={{
                        width: '100%', height: '52px', padding: '0 16px',
                        borderRadius: '12px', border: '1.5px solid #E8DDD2',
                        backgroundColor: '#fff', fontSize: '0.9375rem',
                        outline: 'none', boxSizing: 'border-box',
                        marginBottom: '16px', color: '#2d2d2d',
                        fontFamily: 'inherit',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#7fa896'}
                      onBlur={e => e.target.style.borderColor = '#E8DDD2'}
                    />
                    {previousClients.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', marginBottom: '8px' }}>
                          Recent clients
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {previousClients.slice(0, 8).map(name => (
                            <button
                              key={name}
                              onClick={() => setClientName(name)}
                              className={`qi-pill ${clientName === name ? 'selected' : ''}`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#b0b0b0', marginTop: '16px' }}>
                      🔒 Only stored locally on your device
                    </p>
                  </div>
                )}

                {/* STEP 2: Style + wash */}
                {step === 2 && (
                  <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      What style are they getting today?
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '16px' }}>Select one</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                      {styleOptions.map(s => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`qi-pill ${style === s ? 'selected' : ''}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {style === 'Other' && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
                        <input
                          type="text"
                          value={otherStyle}
                          onChange={e => setOtherStyle(e.target.value)}
                          placeholder="Describe the style"
                          style={{
                            width: '100%', height: '48px', padding: '0 16px',
                            borderRadius: '12px', border: '1.5px solid #E8DDD2',
                            backgroundColor: '#fff', fontSize: '0.875rem',
                            outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                          }}
                          onFocus={e => e.target.style.borderColor = '#7fa896'}
                          onBlur={e => e.target.style.borderColor = '#E8DDD2'}
                        />
                      </motion.div>
                    )}
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px', color: '#2d2d2d' }}>
                      When did they last wash their hair?
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {washOptions.map(w => (
                        <button
                          key={w}
                          onClick={() => setLastWash(w)}
                          className={`qi-sel-card ${lastWash === w ? 'selected' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: lastWash === w ? '#7fa896' : 'transparent',
                              border: lastWash === w ? 'none' : '2px solid #e0e0e0',
                            }}>
                              {lastWash === w && <Check size={10} color="#fff" strokeWidth={2.5} />}
                            </div>
                            <span style={{ fontSize: '0.875rem', color: '#2d2d2d' }}>{w}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Scalp issues */}
                {step === 3 && (
                  <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      Any scalp issues right now?
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '16px' }}>Select all that apply</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                      {scalpIssueOptions.map(issue => (
                        <button
                          key={issue}
                          onClick={() => toggleIssue(issue)}
                          className={`qi-pill ${scalpIssues.includes(issue) ? 'selected' : ''}`}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>

                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      Any areas to pay attention to or avoid?
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '10px' }}>Optional</p>
                    <input
                      type="text"
                      value={attentionAreas}
                      onChange={e => setAttentionAreas(e.target.value)}
                      placeholder="e.g., tender spot at nape, avoid edges"
                      style={{
                        width: '100%', height: '48px', padding: '0 16px',
                        borderRadius: '12px', border: '1.5px solid #E8DDD2',
                        backgroundColor: '#fff', fontSize: '0.875rem',
                        outline: 'none', boxSizing: 'border-box',
                        marginBottom: '24px', fontFamily: 'inherit',
                      }}
                      onFocus={e => e.target.style.borderColor = '#7fa896'}
                      onBlur={e => e.target.style.borderColor = '#E8DDD2'}
                    />

                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px', color: '#2d2d2d' }}>
                      Noticed any thinning or hair loss?
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Yes', 'No', 'Not sure'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setThinning(opt)}
                          className={`qi-pill ${thinning === opt ? 'selected' : ''}`}
                          style={{ flex: 1, textAlign: 'center' }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4: Photo */}
                {step === 4 && (
                  <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      Quick scalp photo
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '24px' }}>
                      Optional,capture the scalp before you start styling
                    </p>
                    <button
                      onClick={() => setPhotoTaken(!photoTaken)}
                      style={{
                        width: '100%', padding: '40px 24px',
                        borderRadius: '16px',
                        border: `2px dashed ${photoTaken ? '#7fa896' : '#E8DDD2'}`,
                        background: photoTaken ? 'rgba(127,168,150,0.06)' : '#fafafa',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '12px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: photoTaken ? 'rgba(127,168,150,0.15)' : '#f0ece8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {photoTaken
                          ? <Check size={26} color="#7fa896" strokeWidth={2} />
                          : <Camera size={26} color="#b0a89e" strokeWidth={1.5} />
                        }
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: photoTaken ? '#3D6B56' : '#2d2d2d', margin: '0 0 4px' }}>
                          {photoTaken ? 'Photo captured' : 'Tap to capture'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0 }}>
                          {photoTaken ? 'Tap to remove' : 'Stored locally only'}
                        </p>
                      </div>
                    </button>
                    <p style={{ fontSize: '0.75rem', color: '#b0b0b0', textAlign: 'center', marginTop: '16px' }}>
                      You can skip this step
                    </p>
                  </div>
                )}

                {/* STEP 5: Summary */}
                {step === 5 && (
                  <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '4px', color: '#2d2d2d' }}>
                      Intake summary
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#9e9e9e', marginBottom: '20px' }}>
                      Review before saving
                    </p>

                    <div style={{
                      border: '1.5px solid #E8DDD2', borderRadius: '16px',
                      overflow: 'hidden', marginBottom: '12px',
                    }}>
                      {[
                        { label: 'Client',      value: clientName },
                        { label: 'Style today', value: finalStyle },
                        { label: 'Last wash',   value: lastWash },
                      ].map((row, i) => (
                        <div key={i}>
                          {i > 0 && <div style={{ height: '1px', background: '#F0EBE5' }} />}
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '13px 16px',
                          }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {row.label}
                            </span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2d2d2d' }}>
                              {row.value}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div style={{ height: '1px', background: '#F0EBE5' }} />
                      <div style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                          Scalp issues
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {scalpIssues.map(i => (
                            <span key={i} style={{
                              padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 500,
                              background: i === 'None' ? 'rgba(127,168,150,0.12)' : 'rgba(201,112,112,0.1)',
                              color: i === 'None' ? '#3D6B56' : '#8A3030',
                            }}>
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>

                      {attentionAreas && (
                        <>
                          <div style={{ height: '1px', background: '#F0EBE5' }} />
                          <div style={{ padding: '13px 16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                              Areas to watch
                            </span>
                            <p style={{ fontSize: '0.875rem', color: '#2d2d2d', margin: 0 }}>{attentionAreas}</p>
                          </div>
                        </>
                      )}

                      <div style={{ height: '1px', background: '#F0EBE5' }} />
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '13px 16px',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Thinning
                        </span>
                        <span style={{
                          fontSize: '0.875rem', fontWeight: 500,
                          color: thinning === 'Yes' ? '#8A3030' : thinning === 'No' ? '#3D6B56' : '#9e9e9e',
                        }}>
                          {thinning}
                        </span>
                      </div>

                      {photoTaken && (
                        <>
                          <div style={{ height: '1px', background: '#F0EBE5' }} />
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '13px 16px',
                          }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Photo
                            </span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#3D6B56' }}>✓ Captured</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Risk banner */}
                    <div style={{
                      padding: '12px 16px', borderRadius: '12px', textAlign: 'center',
                      background: riskConfig[computeRisk()].bg,
                      fontSize: '0.875rem', fontWeight: 500,
                      color: riskConfig[computeRisk()].color,
                    }}>
                      {riskConfig[computeRisk()].text}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Bottom button ── */}
          <div style={{ paddingTop: '12px' }}>
            <button
              onClick={step < totalSteps ? () => setStep(step + 1) : handleSave}
              disabled={!canProceed()}
              style={{
                width: '100%', height: '56px', borderRadius: '12px', border: 'none',
                fontWeight: 600, fontSize: '1rem',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                backgroundColor: canProceed() ? '#7fa896' : '#e8e8e8',
                color: canProceed() ? '#fff' : '#b0b0b0',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {step === totalSteps ? 'Save intake' : step === 4 && !photoTaken ? 'Skip' : 'Next'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default StylistQuickIntake;