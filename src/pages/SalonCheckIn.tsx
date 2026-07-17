import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Upload, Check, X, ClipboardCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useApp } from '@/contexts/AppContext';

const dm       = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

const C = {
  bg:          'var(--color-background-tertiary)',
  card:        'var(--color-background-primary)',
  text:        'var(--color-text-primary)',
  muted:       'var(--color-text-secondary)',
  green:       '#2d6e55',
  darkGreen:   '#1a4d3a',
  greenLight:  '#e8f4ef',
  greenBorder: 'rgba(45,110,85,0.18)',
  green10:     'rgba(45,110,85,0.10)',
  mid:         'var(--color-border-tertiary)',
  shadow:      '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
};

const regions = ['Front hairline', 'Crown / vertex', 'Nape', 'Left temple', 'Right temple', 'Part line', 'Area of concern'];

const observations = [
  { id: 'thinning',    label: 'Thinning' },
  { id: 'redness',     label: 'Redness / irritation' },
  { id: 'flaking',     label: 'Flaking / buildup' },
  { id: 'tenderness',  label: 'Tenderness (reported by client)' },
  { id: 'bumps',       label: 'Bumps / folliculitis' },
  { id: 'healthy',     label: 'Healthy / no concerns' },
];

interface CapturedPhoto {
  id: string; region: string; dataUrl: string;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1.5px solid ${C.greenBorder}`,
  borderRadius: 16,
  boxShadow: C.shadow,
};

const primaryBtn: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 16, border: 'none',
  background: C.green, color: '#fff',
  fontFamily: dm, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(45,110,85,0.28)',
};

interface CapturedPhoto {
  id: string;
  region: string;
  dataUrl: string;
}

const SalonCheckIn = () => {
  const navigate = useNavigate();
  const [step, setStep]                     = useState(0);
  const [photos, setPhotos]                 = useState<CapturedPhoto[]>([]);
  const [selectedRegion, setSelectedRegion] = useState(regions[0]);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [note, setNote]                     = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleObservation = (id: string) => {
    if (id === 'healthy') {
      setSelectedObservations(prev => prev.includes('healthy') ? [] : ['healthy']);
      return;
    }
    setSelectedObservations(prev => {
      const filtered = prev.filter(o => o !== 'healthy');
      return filtered.includes(id) ? filtered.filter(o => o !== id) : [...filtered, id];
    });
  };


  // ─── Helper: Convert dataURL to File (same as your onboarding) ───
  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };
  
  // ─── Upload single image to Supabase Storage ───
  const uploadImageToSupabase = async (file: File, userId: string, region: string): Promise<string> => {
    const fileName = `${region}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filePath = `${userId}/salon-checkin/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('Salon-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('Salon-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const uploadSalonPhoto = async (file: File, userId: string, region: string): Promise<string> => {
    const fileName = `${region}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('Salon-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('Salon-photos').getPublicUrl(filePath);
    return urlData.publicUrl;
  };
  
  // ─── Complete Check-in ───
  const handleComplete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('No active session. Please log in again.');
      }

      const userId = session.user.id;

      // 1. Create salon_visits record
      const { data: visitData, error: visitError } = await supabase
        .from('salon_visits')
        .insert({
          user_id: userId,
          visit_type: 'stylist_checkin',
          observations: selectedObservations.map(id =>
            observations.find(o => o.id === id)?.label || id
          ),
          notes: note.trim() || null,
        })
        .select('id')
        .single();

      if (visitError || !visitData) {
        throw visitError || new Error('Failed to create visit record');
      }

      const salonVisitId = visitData.id;

      // 2. Upload photos and save to salon_visit_photos table
      const photoPromises = photos.map(async (photo) => {
        try {
          const file = dataURLtoFile(photo.dataUrl, `${photo.region}.jpg`);
          const photoUrl = await uploadSalonPhoto(file, userId, photo.region);

          await supabase.from('salon_visit_photos').insert({
            salon_visit_id: salonVisitId,
            photo_url: photoUrl,
            region_tag: photo.region,
            annotation_notes: null,
          });

          return photoUrl;
        } catch (err) {
          console.error(`Failed to upload photo for ${photo.region}:`, err);
          return null;
        }
      });

      await Promise.all(photoPromises);

      toast({
        title: 'Salon check-in saved',
        description: `${photos.length} photo${photos.length !== 1 ? 's' : ''} and observations recorded.`,
      });

      setStep(4);
    } catch (err ) {
      console.error('Salon check-in error:', err);
      toast({
        title: 'Save failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleCapture = (capture?: 'user' | 'environment') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (capture) {
      input.capture = capture;
    }
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, {
          id: `photo-${Date.now()}`,
          region: selectedRegion,
          dataUrl: ev.target?.result as string,
        }
      ]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: dm, display: 'flex', flexDirection: 'column' }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');`}</style>

      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: '52px 20px 32px' }}>

        {/* Header */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <button
              onClick={() => step === 0 ? navigate(-1) : setStep(step - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: dm, fontSize: 13, fontWeight: 500, color: C.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={16} strokeWidth={2} color={C.green} />
              {step === 0 ? 'Back' : 'Previous'}
            </button>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3].map(s => (
                <div key={s} style={{
                  width: 28, height: 4, borderRadius: 4,
                  background: s <= step ? C.green : C.greenBorder,
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Step 0: Intro ── */}
          {step === 0 && (
            <motion.div key="intro"
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: C.green10, border: `2px solid ${C.greenBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                }}>
                  <ClipboardCheck size={34} color={C.green} strokeWidth={1.6} />
                </div>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                  <span style={{ fontFamily: dm, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FolliSense</span>
                  <span style={{ fontFamily: dm, fontSize: 9, fontWeight: 600, background: C.greenLight, color: C.darkGreen, border: `1px solid ${C.greenBorder}`, padding: '1px 8px', borderRadius: 100 }}>Stylist</span>
                </div>
                <h1 style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.text, margin: '0 0 10px', lineHeight: 1.2 }}>
                  Salon Check-in
                </h1>
                <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
                  Hand your phone to your stylist. They'll capture the scalp condition during your appointment.
                </p>
                <div style={{ ...cardStyle, padding: '14px 16px', width: '100%', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.green10, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                  </div>
                  <p style={{ fontFamily: dm, fontSize: 12, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                    All data stays in your account. Your stylist doesn't need to log in or create an account.
                  </p>
                </div>
              </div>
              <button onClick={() => setStep(1)} style={{ ...primaryBtn, marginTop: 24 }}>
                Start Check-in
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Photos ── */}
          {step === 1 && (
            <motion.div key="photos"
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>Capture the scalp</h2>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 20px' }}>Take photos of different areas. Tag each with the region.</p>

              {/* Region pills */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as const }}>
                {regions.map(r => (
                  <button key={r} onClick={() => setSelectedRegion(r)} style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 100,
                    fontFamily: dm, fontSize: 11, fontWeight: 600,
                    border: selectedRegion === r ? 'none' : `1.5px solid ${C.greenBorder}`,
                    background: selectedRegion === r ? C.green : C.card,
                    color: selectedRegion === r ? '#fff' : C.muted,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: selectedRegion === r ? '0 2px 8px rgba(45,110,85,0.28)' : 'none',
                  }}>
                    {r}
                  </button>
                ))}
              </div>

              {/* Camera / upload buttons */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button onClick={() => handleCapture('environment')} style={{
                  flex: 1, height: 110, borderRadius: 18,
                  border: `1.5px dashed ${C.green}`,
                  background: C.green10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', fontFamily: dm,
                }}>
                  <Camera size={26} color={C.green} strokeWidth={1.6} />
                  <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.green }}>Take photo</span>
                </button>
                <button onClick={() => handleCapture()} style={{
                  flex: 1, height: 110, borderRadius: 18,
                  border: `1.5px dashed ${C.greenBorder}`,
                  background: C.card,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                }}>
                  <Upload size={26} color={C.muted} strokeWidth={1.6} />
                  <span style={{ fontFamily: dm, fontSize: 13, fontWeight: 600, color: C.muted }}>Upload</span>
                </button>
              </div>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontFamily: dm, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={photo.dataUrl} alt={photo.region} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,77,58,0.75)', padding: '3px 6px', textAlign: 'center' }}>
                          <span style={{ fontFamily: dm, fontSize: 9, color: '#d3ede0', fontWeight: 600 }}>{photo.region}</span>
                        </div>
                        <button onClick={() => removePhoto(photo.id)} style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(26,77,58,0.75)', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={11} color="#fff" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                <button onClick={() => setStep(2)} style={primaryBtn}>
                  {photos.length > 0 ? 'Next,Add observations' : 'Skip photos'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Observations ── */}
          {step === 2 && (
            <motion.div key="observations"
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>What do you see?</h2>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 20px' }}>Tap all that apply</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {observations.map(obs => {
                  const selected = selectedObservations.includes(obs.id);
                  return (
                    <button
                      key={obs.id}
                      onClick={() => toggleObservation(obs.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '14px 16px', borderRadius: 16,
                        border: `1.5px solid ${selected ? C.green : C.greenBorder}`,
                        background: selected ? C.green10 : C.card,
                        cursor: 'pointer', fontFamily: dm,
                        display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: selected ? `0 2px 10px rgba(45,110,85,0.1)` : C.shadow,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        background: selected ? C.green : 'transparent',
                        border: `2px solid ${selected ? C.green : C.greenBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {selected && <Check size={12} color="#fff" strokeWidth={2.8} />}
                      </div>
                      <span style={{ fontFamily: dm, fontSize: 14, fontWeight: 500, color: selected ? C.darkGreen : C.text }}>
                        {obs.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedObservations.length === 0}
                  style={{
                    ...primaryBtn,
                    opacity: selectedObservations.length === 0 ? 0.4 : 1,
                    cursor: selectedObservations.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: selectedObservations.length === 0 ? 'none' : '0 4px 14px rgba(45,110,85,0.28)',
                  }}
                >
                  Next,Add notes
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Notes ── */}
          {step === 3 && (
            <motion.div key="notes"
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <h2 style={{ fontFamily: playfair, fontSize: 22, fontWeight: 500, color: C.text, margin: '0 0 4px' }}>Anything else to note?</h2>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, margin: '0 0 20px' }}>Optional,add anything the client should know</p>

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Edges are thinning,suggested looser braid tension next time. Noticed some flaking at the crown."
                rows={5}
                style={{
                  width: '100%', padding: '14px 16px',
                  borderRadius: 16, border: `1.5px solid ${C.greenBorder}`,
                  background: C.card, color: C.text,
                  fontFamily: dm, fontSize: 13, lineHeight: 1.6,
                  resize: 'none', outline: 'none',
                  boxShadow: C.shadow, boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.border = `1.5px solid ${C.green}`)}
                onBlur={e => (e.currentTarget.style.border = `1.5px solid ${C.greenBorder}`)}
              />

              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <button onClick={handleComplete} disabled={isSaving} style={primaryBtn}>
                  {isSaving ? 'Saving...' : 'Complete check-in'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <motion.div key="done"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 8px' }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: C.green10, border: `2px solid ${C.greenBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}>
                <Check size={34} color={C.green} strokeWidth={1.8} />
              </div>
              <h2 style={{ fontFamily: playfair, fontSize: 24, fontWeight: 500, color: C.text, margin: '0 0 8px' }}>
                Check-in complete
              </h2>
              <p style={{ fontFamily: dm, fontSize: 13, color: C.muted, marginBottom: 28, lineHeight: 1.5 }}>
                Hand the phone back to your client.
              </p>

              {/* Summary card */}
              <div style={{ ...cardStyle, padding: '16px 18px', width: '100%', textAlign: 'left', marginBottom: 24 }}>
                <p style={{ fontFamily: dm, fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  Summary
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    `${photos.length} photo${photos.length !== 1 ? 's' : ''} captured`,
                    `${selectedObservations.length} observation${selectedObservations.length !== 1 ? 's' : ''} flagged`,
                    ...(note ? ['Note included'] : []),
                  ].map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
                      <span style={{ fontFamily: dm, fontSize: 13, color: C.text }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => navigate('/home')} style={{ ...primaryBtn, width: '100%' }}>
                Back to dashboard
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default SalonCheckIn;