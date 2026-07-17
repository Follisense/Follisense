import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import scalpImg1 from '@/assets/norwood_v2_stage_1.png';
import scalpImg2 from '@/assets/norwood_v2_stage_2.png';
import scalpImg3 from '@/assets/norwood_v2_stage_3.png';
import scalpImg4 from '@/assets/norwood_v2_stage_4.png';
import scalpImg5 from '@/assets/norwood_v2_stage_5.png';
import scalpImg6 from '@/assets/norwood_v2_stage_6.png';
import scalpImg7 from '@/assets/norwood_v2_stage_7.png';

const sage   = '#7fa896';
const sageB  = 'rgba(124,154,142,0.08)';
const border = '#E8DED1';
const itemBg = '#F5F0EB';
const ink    = '#2d2d2d';
const muted  = '#9e9e9e';

// Per-image crop tuning: adjust `pos` (objectPosition) and `zoom` (scale) per
// stage until the heads sit at roughly the same size and position in every
// card. pos examples: 'center top', 'center 20%', '50% 10%'. zoom 1 = as-is,
// 1.2 = 20% tighter crop, 0.9 not possible with cover (use pos instead).
const stages = [
  { id: '1', label: 'Stage 1', desc: 'Full hairline, no recession',            img: scalpImg1, pos: 'center top', zoom: 1 },
  { id: '2', label: 'Stage 2', desc: 'Slight recession at temples',            img: scalpImg2, pos: 'center top', zoom: 1 },
  { id: '3', label: 'Stage 3', desc: 'Deeper temple recession',                img: scalpImg3, pos: 'center top', zoom: 1 },
  { id: '4', label: 'Stage 4', desc: 'Significant recession + crown thinning', img: scalpImg4, pos: 'center top', zoom: 1 },
  { id: '5', label: 'Stage 5', desc: 'Large bald areas, narrow bridge',        img: scalpImg5, pos: 'center top', zoom: 1 },
  { id: '6', label: 'Stage 6', desc: 'Bridge of hair gone',                    img: scalpImg6, pos: 'center top', zoom: 1 },
  { id: '7', label: 'Stage 7', desc: 'Only sides and back remain',             img: scalpImg7, pos: 'center top', zoom: 1 },
];

interface NorwoodScaleProps {
  selected: string;
  onSelect: (stage: string) => void;
}

const NorwoodScale = ({ selected, onSelect }: NorwoodScaleProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: ink, marginBottom: 4 }}>
        What does your hairline look like?
      </h2>
      <p style={{ fontSize: '0.75rem', color: muted, marginBottom: 20, lineHeight: 1.5 }}>
        Tap the stage that best matches your current hairline. This helps us track changes over time.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {stages.map(stage => {
          const isSel = selected === stage.id;
          const isExp = expanded === stage.id;
          return (
            <motion.div key={stage.id} layout
              style={{ borderRadius: 14, overflow: 'hidden', border: `2px solid ${isSel ? sage : border}`, background: isSel ? sageB : itemBg, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
              onClick={() => { onSelect(stage.id); setExpanded(isExp ? null : stage.id); }}
            >
              {/* Image */}
              <div style={{ height: 150, overflow: 'hidden', position: 'relative', background: '#e0d8d0' }}>
                <img src={stage.img} alt={stage.label}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    objectPosition: stage.pos,
                    transform: stage.zoom !== 1 ? `scale(${stage.zoom})` : undefined,
                    transformOrigin: 'center top',
                    display: 'block',
                  }} />
                {isSel && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{ padding: '6px 8px 8px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: isSel ? sage : ink, margin: '0 0 1px' }}>{stage.label}</p>
                <p style={{ fontSize: '0.65rem', color: muted, margin: 0, lineHeight: 1.3 }}>{stage.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 16, background: `${sage}15`, border: `1.5px solid ${sage}40`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={14} color={sage} strokeWidth={2.5} />
          <p style={{ fontSize: '0.8rem', color: sage, fontWeight: 600, margin: 0 }}>
            {stages.find(s => s.id === selected)?.label} selected: {stages.find(s => s.id === selected)?.desc}
          </p>
        </motion.div>
      )}

      <p style={{ fontSize: '0.7rem', color: muted, marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
        Not sure? Pick the closest match. You can update this later.
      </p>
    </div>
  );
};

export default NorwoodScale;