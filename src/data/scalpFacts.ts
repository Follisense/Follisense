// src/data/scalpFacts.ts
//
// The "Did you know?" strip on the home page. One fact per day, rotating by
// date, so everyone sees the same one and it changes at midnight.
//
// RULES for anything added here:
//   1. Education only. No product claims, no treatment claims, nothing that
//      tells someone what to do about a symptom.
//   2. Nothing that reads as a diagnosis or a prediction.
//   3. Where the evidence is thin, say so in the fact itself rather than
//      stating folklore as settled ("the evidence is mostly anecdotal").
//   4. Keep each to one or two sentences. This renders in an 11px strip.
//
// A handful of these touch clinical territory (shedding norms, ferritin,
// postpartum, pattern loss). Worth having Maryann read the list before it
// ships.

export const scalpFacts: string[] = [
  // ── Structure and biology ────────────────────────────────────────────
  'Type 4 hair has more twists along each strand, and every twist is a point where it can snap.',
  'Shrinkage can hide most of your real length. It is a sign of elasticity, not damage.',
  'Your scalp renews its skin roughly every month, about the length of one style cycle.',
  'Hair is no longer living once it leaves the follicle. Everything you do for it is protection, not repair.',
  'Each follicle grows, rests and sheds on its own schedule, which is why you never lose it all at once.',
  'Sebum travels down a straight strand easily and struggles to travel down a coiled one. That is why coily hair reads as drier.',
  'Your scalp has its own microbiome, a mix of bacteria and yeast that lives there normally.',
  'Malassezia yeast lives on almost everyone\'s scalp. Flaking tends to follow a shift in the balance, not the yeast itself.',
  'Scalp skin sits slightly acidic. Most shampoos are more alkaline than that.',
  'Fine hair and thin hair are different things. One describes the width of a strand, the other how many you have.',
  'You can have a great deal of hair and still have fine strands.',
  'Grey hair is not pigment leaving the strand. It is the pigment cells in the follicle slowing down.',
  'Hair is mostly protein, which is why long-term low protein intake eventually shows up in it.',

  // ── Length, growth and shedding ──────────────────────────────────────
  'Hair grows roughly a centimetre a month on average. Length is won by keeping it, not by growing it faster.',
  'Losing 50 to 100 hairs a day is normal for most people.',
  'The hair that comes out at takedown accumulated over the whole time the style was in, not that morning.',
  'Most breakage happens at the ends, because the ends are the oldest part of the strand.',
  'Trimming does not make hair grow faster. It removes split ends before they travel further up.',
  'Many people shed more in some seasons than others.',
  'Shedding that follows a stressful period usually shows up two to three months later, not during it.',
  'Crash dieting can trigger shedding, because the body treats hair as non-essential when it is short of fuel.',
  'Iron and ferritin are among the first things a doctor checks when hair thins.',

  // ── Scalp health and styles ──────────────────────────────────────────
  'Traction alopecia is one of the most reversible kinds of hair loss when it is caught early.',
  'Edges are the finest hairs on your head and take the most tension from most styles.',
  'Pain during braiding is not a sign of a good install, and it is not something to sit through.',
  'A style that itches from the first day rarely settles on its own.',
  'Bumps along the hairline after a fresh install are more often tension than infection.',
  'Cornrows and braids hold steady tension on the same follicles for weeks at a time.',
  'Two styles worn back to back on the same tension points give the scalp no recovery time.',
  'Wash day is the only day most people really see their scalp while a protective style is in.',
  'Locs need the scalp cleaned as much as any other style, not less.',
  'Retwisting too tightly or too often is one of the commonest causes of thinning at the root in locs.',
  'Sweat left sitting on the scalp can irritate it, especially under a style that traps it.',
  'Buildup flakes and dandruff flakes look alike but behave differently over time.',
  'Razor bumps happen when a hair curls back into the skin, which is more common with coiled hair.',
  'Male pattern loss and traction loss look different. One recedes fairly evenly, the other follows wherever the tension was.',

  // ── Care and handling ────────────────────────────────────────────────
  'Protein and moisture pull in opposite directions. Too much of either makes hair feel wrong in a different way.',
  'High porosity hair takes water in quickly and loses it quickly. Low porosity resists both.',
  'Water is the only true moisturiser for hair. Everything else helps it stay put.',
  'Oiling the scalp is not the same as moisturising it. Oil seals, water moisturises.',
  'A satin surface reduces friction overnight. Cotton pulls both moisture and grip from hair.',
  'A wide-tooth comb through wet, conditioned hair breaks fewer strands than a fine comb through dry hair.',
  'Detangling from the ends upward causes less breakage than starting at the root.',
  'Heat changes the internal structure of a strand well below the temperatures most irons reach.',
  'Hair does not get used to a product. What changes is what has built up on the strand.',
  'Coconut oil is one of the few oils shown to reduce protein loss from hair during washing.',

  // ── Hormones and life stages ─────────────────────────────────────────
  'Postpartum shedding is hair that stayed in place during pregnancy catching up all at once.',
  'Pregnancy and menopause both move hair through hormonal change, in opposite directions.',

  // ── Myths, honestly ──────────────────────────────────────────────────
  'Rice water is popular for length. The evidence behind it is mostly anecdotal.',
  'Scalp massage feels good and briefly increases blood flow. Whether it grows hair is not settled.',
  'Shaving does not make hair grow back thicker. A blunt tip just feels coarser than a tapered one.',

  // ── Tracking ─────────────────────────────────────────────────────────
  'Photographs beat memory. Scalp change is too slow for the eye to catch day to day.',
];

/** The fact for a given day. Same for everyone, changes at midnight. */
export const factOfTheDay = (d: Date = new Date()): string => {
  // Day-of-year rather than day-of-month, so a 52-entry list actually cycles
  // through all of it instead of only ever showing the first 31.
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return scalpFacts[dayOfYear % scalpFacts.length];
};