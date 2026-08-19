import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Photos live in Supabase storage, never in localStorage.
const UPLOAD_BUCKET = 'Checkin-photos';

// Set to true only if you want the seeded demo content back for a walkthrough.
// It is off by default: a real user must never see check-ins, salon visits or
// cycle history they did not create.
const DEMO_MODE = false;

export interface BaselinePhoto {
  area: string;
  captured: boolean;
  date: string;
  /** In-memory only during capture. Never persisted to localStorage. */
  dataUrl?: string;
  /** Path inside UPLOAD_BUCKET once the photo has reached Supabase. */
  storagePath?: string;
}

export interface OnboardingData {
  gender: string;
  hairType: string;
  chemicalProcessing: string;
  lastChemicalTreatment: string;
  chemicalProcessingMultiple: string[];
  chemicalBrand: string;
  chemicalBrandOther: string;
  chemicalFrequency: string;
  protectiveStyles: string[];
  barberFrequency: string;
  locRetwistFrequency: string;
  maleStyleFrequency: string;
  otherStyle: string;
  protectiveStyleFrequency: string;
  isWornOutOnly: boolean;
  cycleLength: string;
  cycleLengthMin: string;
  cycleLengthMax: string;
  washFrequency: string;
  washFrequencyPerCycle: string;
  betweenWashCare: string[];
  otherBetweenWashCare: string;
  wornOutWashFrequency: string;
  restyleFrequency: string;
  baselineItch: string;
  baselineTenderness: string;
  baselineHairline: string;
  baselineHairHealth: string;
  scalpProducts: string[];
  otherProduct: string;
  productFrequency: string;
  menstrualTracking: string;
  lastPeriodDate: string;
  menstrualCycleLength: string;
  hormonalContraception: string;
  goals: string[];
  hairProducts: string[];
  otherHairProduct: string;
  hairProductFrequency: string;
  scalpProductFrequency: string;
  norwoodBaseline?: string;
  familyHistory?: string;
  cutCadence?: string;
}

export interface CheckInData {
  itch: string;
  tenderness: string;
  hairline: string;
  flaking?: string;
  shedding?: string;
  bumps?: string;
  dryness?: string;
  hairFeel?: string;
  hairBreakage?: string;
  hairAppearance?: string;
  hairConcern?: string;
  newProducts?: string;
  newProductDetails?: string;
  razorBumps?: string;
  barberIrritation?: string;
  type: 'mid-cycle' | 'wash-day' | 'baseline';
  date: string;
}

export interface SalonVisit {
  id: string;
  date: string;
  services: string[];
  stylistName?: string;
  notes?: string;
}

export interface ClientObservation {
  id: string;
  clientName: string;
  date: string;
  observations: string[];
  photos: string[];
  photoAreas: string[];
  notes?: string;
  risk: 'green' | 'amber' | 'red';
  location?: string;
  locationCity?: string;
  service?: string;
  comparison?: string;
  clientType?: 'new' | 'returning';
}

export interface StylistLocation {
  id: string;
  name: string;
  city: string;
  isPrimary: boolean;
}

export interface CycleEntry {
  id: string;
  style: string;
  startDate: string;
  endDate: string;
  days: number;
  risk: 'green' | 'amber' | 'red';
  checkIn?: CheckInData;
}

export interface StylistObservationEntry {
  id: string;
  date: string;
  stylistName: string;
  location?: string;
  observations: string[];
  notes?: string;
  comparison?: string;
  risk: 'green' | 'amber' | 'red';
}

export interface HealthProfileData {
  sweat: string;
  exercise: string;
  heatStyling: string;
  satinCovering: string;
  medicalConditions: string[];
  pregnancyStatus: string;
  medications: string;
  medicationDetails: string;
  lastBloodTest: string;
  bloodLevels: Record<string, string>;
  skinConditions: string[];
  skinConditionDetails: string;
  sensitiveSkin: string;
  recentStressors: string[];
  previousHairLoss: string;
  diagnosedCondition: string;
  diagnosedConditionDetails: string;
  familyHistory: string;
}

export interface QuickLogEntry {
  id: string;
  date: string;
  symptoms: string[];
  severity: string;
}

export interface ResearchData {
  consented: boolean;
  consentDate: string | null;
  photoCount: number;
  dismissed: boolean;
}

// ── Auth user shape ───────────────────────────────────────────
export interface AppUser {
  id: string;
  name: string;
  email?: string;
}

const defaultHealthProfile: HealthProfileData = {
  sweat: '', exercise: '', heatStyling: '', satinCovering: '',
  medicalConditions: [], pregnancyStatus: '', medications: '', medicationDetails: '',
  lastBloodTest: '', bloodLevels: {}, skinConditions: [], skinConditionDetails: '',
  sensitiveSkin: '', recentStressors: [], previousHairLoss: '',
  diagnosedCondition: '', diagnosedConditionDetails: '', familyHistory: '',
};

interface AppContextType {
  // ── Auth ────────────────────────────────────────────────────
  user: AppUser | null;
  routineLastUpdated: number;
  setRoutineLastUpdated: (ts: number) => void;

  // ── Existing state ──────────────────────────────────────────
  userName: string;
  setUserName: (n: string) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  onboardingData: OnboardingData;
  setOnboardingData: (d: OnboardingData) => void;
  currentCheckIn: CheckInData | null;
  setCurrentCheckIn: (d: CheckInData | null) => void;
  checkInHistory: CheckInData[];
  addToCheckInHistory: (c: CheckInData) => void;
  history: CycleEntry[];
  salonVisits: SalonVisit[];
  addSalonVisit: (v: SalonVisit) => void;
  riskOverride: 'green' | 'amber' | 'red' | null;
  setRiskOverride: (r: 'green' | 'amber' | 'red' | null) => void;
  stylistMode: boolean;
  setStylistMode: (v: boolean) => void;
  clientObservations: ClientObservation[];
  addClientObservation: (o: ClientObservation) => void;
  stylistObservations: StylistObservationEntry[];
  stylistLocations: StylistLocation[];
  setStylistLocations: (locs: StylistLocation[]) => void;
  addStylistLocation: (loc: StylistLocation) => void;
  removeStylistLocation: (id: string) => void;
  healthProfile: HealthProfileData;
  setHealthProfile: (d: HealthProfileData) => void;
  baselinePhotos: BaselinePhoto[];
  setBaselinePhotos: (photos: BaselinePhoto[]) => void;
  baselineRisk: 'green' | 'amber' | 'red' | null;
  setBaselineRisk: (r: 'green' | 'amber' | 'red' | null) => void;
  baselineDate: string | null;
  setBaselineDate: (d: string | null) => void;
  quickLogs: QuickLogEntry[];
  addQuickLog: (entry: QuickLogEntry) => void;
  research: ResearchData;
  setResearch: (d: ResearchData) => void;
  incrementResearchPhotos: () => void;
  checkInCount: number;
  setCheckInCount: (n: number) => void;
  progressiveDismissed: Record<string, boolean>;
  dismissProgressivePrompt: (key: string) => void;
  resetAll: () => void;
}

const defaultOnboarding: OnboardingData = {
  gender: '', hairType: '', chemicalProcessing: '', lastChemicalTreatment: '',
  chemicalProcessingMultiple: [], chemicalBrand: '', chemicalBrandOther: '', chemicalFrequency: '',
  protectiveStyles: [], barberFrequency: '',
  locRetwistFrequency: '', maleStyleFrequency: '', otherStyle: '',
  protectiveStyleFrequency: '', isWornOutOnly: false, cycleLength: '',
  cycleLengthMin: '', cycleLengthMax: '', washFrequency: '',
  washFrequencyPerCycle: '', betweenWashCare: [], otherBetweenWashCare: '',
  wornOutWashFrequency: '', restyleFrequency: '', baselineItch: '',
  baselineTenderness: '', baselineHairline: '', baselineHairHealth: '',
  scalpProducts: [], otherProduct: '', productFrequency: '',
  menstrualTracking: '', lastPeriodDate: '', menstrualCycleLength: '',
  hormonalContraception: '', goals: [], hairProducts: [],
  otherHairProduct: '', hairProductFrequency: '', scalpProductFrequency: '',
  norwoodBaseline: '', familyHistory: '', cutCadence: '',
};

// ─── DEMO CONTENT ─────────────────────────────────────────────
// Only reachable when DEMO_MODE is true. These used to be the DEFAULTS, which
// meant a brand new user opened the app to three check-ins, five style cycles
// and a set of salon visits none of which they had ever done, each carrying
// symptom values and a risk rating. In a scalp health app that is fabricated
// history in the patient view. They are now opt-in and default to empty.
const demoHistory: CycleEntry[] = [
  { id: '1', style: 'Braids', startDate: 'Jan 5', endDate: 'Feb 2', days: 28, risk: 'green', checkIn: { itch: 'None', tenderness: 'None', hairline: 'No change', flaking: 'None', shedding: 'Normal', type: 'wash-day', date: 'Feb 2' } },
  { id: '2', style: 'Twists', startDate: 'Feb 3', endDate: 'Feb 20', days: 17, risk: 'green', checkIn: { itch: 'Mild', tenderness: 'None', hairline: 'No change', flaking: 'None', shedding: 'Normal', type: 'wash-day', date: 'Feb 20' } },
  { id: '3', style: 'Braids', startDate: 'Feb 21', endDate: 'Mar 18', days: 25, risk: 'amber', checkIn: { itch: 'Moderate', tenderness: 'A little', hairline: 'Looks a bit thinner', flaking: 'Some flaking', shedding: 'More than usual', type: 'wash-day', date: 'Mar 18' } },
  { id: '4', style: 'Wig', startDate: 'Mar 19', endDate: 'Apr 2', days: 14, risk: 'amber', checkIn: { itch: 'Mild', tenderness: 'Yes, noticeably', hairline: 'Looks a bit thinner', flaking: 'None', shedding: 'Normal', type: 'wash-day', date: 'Apr 2' } },
  { id: '5', style: 'Braids', startDate: 'Apr 3', endDate: 'Present', days: 14, risk: 'green' },
];

const demoSalonVisits: SalonVisit[] = [
  { id: 'sv1', date: 'Feb 25', services: ['Wash', 'Treatment'], stylistName: 'Ama', notes: 'Deep conditioning treatment' },
  { id: 'sv2', date: 'Feb 2', services: ['Style installation'], stylistName: 'Ama' },
];

const demoClientObservations: ClientObservation[] = [
  { id: 'co1', clientName: 'A.M.', date: 'Mar 5', observations: ['Thinning at hairline or edges', 'Signs of traction damage'], photos: ['Hairline / edges'], photoAreas: ['Hairline or temples'], notes: 'Recommended loosening edges on next install', risk: 'amber', location: 'Natural Touch Studio', locationCity: 'Lekki', service: 'Style installation (braids, cornrows, twists, etc.)', comparison: 'Worse than last time', clientType: 'returning' },
  { id: 'co2', clientName: 'T.K.', date: 'Mar 3', observations: ['General check, nothing concerning'], photos: [], photoAreas: [], risk: 'green', location: 'Natural Touch Studio', locationCity: 'Lekki', service: 'Wash', clientType: 'new' },
  { id: 'co3', clientName: 'S.J.', date: 'Feb 28', observations: ['Excessive flaking or buildup', 'Scalp redness or irritation'], photos: ['Crown / vertex'], photoAreas: ['Crown or vertex'], notes: 'Suggested anti-dandruff shampoo', risk: 'amber', location: 'Natural Touch Studio', locationCity: 'Lekki', service: 'Scalp treatment', comparison: 'About the same', clientType: 'returning' },
  { id: 'co4', clientName: 'R.B.', date: 'Feb 20', observations: ['Thinning at crown or vertex', 'Tender or sore areas'], photos: ['Crown / vertex', 'Hairline / edges'], photoAreas: ['Crown or vertex', 'Hairline or temples'], risk: 'red', location: 'Home Studio', locationCity: 'Ikeja', service: 'General consultation', clientType: 'new' },
];

const demoStylistObservations: StylistObservationEntry[] = [
  { id: 'so1', date: 'Feb 25', stylistName: 'Ama', location: 'Natural Touch Studio, Lekki', observations: ['Thinning at hairline or edges', 'Signs of traction damage'], notes: 'Stylist noted: slight thinning at temples.', comparison: 'Worse than last time', risk: 'amber' },
  { id: 'so2', date: 'Feb 2', stylistName: 'Ama', location: 'Natural Touch Studio, Lekki', observations: ['General check, nothing concerning'], comparison: 'About the same', risk: 'green' },
];

const demoCheckInHistory: CheckInData[] = [
  { itch: 'Mild', tenderness: 'None', hairline: 'No change', flaking: 'None', shedding: 'Normal', type: 'wash-day', date: 'Apr 2' },
  { itch: 'Moderate', tenderness: 'A little', hairline: 'Looks a bit thinner', flaking: 'Some flaking', shedding: 'More than usual', type: 'wash-day', date: 'Mar 18' },
  { itch: 'Mild', tenderness: 'None', hairline: 'No change', flaking: 'None', shedding: 'Normal', type: 'wash-day', date: 'Feb 20' },
];

// Stylist locations are configuration rather than fabricated history, so these
// stay as the starting set.
const defaultStylistLocations: StylistLocation[] = [
  { id: 'loc1', name: 'Natural Touch Studio', city: 'Lekki', isPrimary: true },
  { id: 'loc2', name: 'Home Studio', city: 'Ikeja', isPrimary: false },
];

const seed = <T,>(demo: T[]): T[] => (DEMO_MODE ? demo : []);

// ─── localStorage ─────────────────────────────────────────────
const STORAGE_KEY = 'follisense-app-state';

const loadState = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

// Photo data URLs are stripped before writing. A single base64 scalp photo runs
// to several hundred KB; four of them put this key at 1.4MB, which is ~28% of
// the 5MB origin quota, parsed and re-serialised on every state change. The
// photos belong in Supabase storage and the migration below puts them there.
const stripHeavyFields = (state: any) => ({
  ...state,
  baselinePhotos: (state.baselinePhotos || []).map((p: BaselinePhoto) => ({
    area: p.area,
    captured: p.captured,
    date: p.date,
    ...(p.storagePath ? { storagePath: p.storagePath } : {}),
  })),
});

const saveState = (state: object) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyFields(state)));
  } catch (e) {
    // Previously swallowed. A failed write here means the user's state silently
    // does not survive a reload, which is worth knowing about.
    console.error('[AppContext] localStorage write failed:', e);
  }
};

// ─── BASELINE PHOTO MIGRATION ─────────────────────────────────
// Runs once per session, after the user is known. Three cases:
//  1. No local dataUrls        → nothing to do.
//  2. Baseline photos already in checkin_photos → the local copies are
//     redundant; drop them.
//  3. Baseline photos NOT in the database → upload, insert the rows, then drop.
// Case 3 must happen before the dataUrls are discarded or those photos are gone
// for good, which is why this runs on load rather than as a one-off script.

const MAX_EDGE = 1280;

const downscale = async (dataUrl: string): Promise<Blob> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85);
  });
};

const migrateBaselinePhotos = async (
  uid: string,
  photos: BaselinePhoto[],
  apply: (next: BaselinePhoto[]) => void,
) => {
  const pending = photos.filter(p => p.dataUrl && !p.storagePath);
  if (pending.length === 0) return;

  const stripped = () => photos.map(({ dataUrl, ...rest }) => rest);

  try {
    // Baseline rows are written as type 'visual' with is_baseline true.
    // 'progress_photo' is not a permitted value of checkins.type.
    const { data: baselineRows, error: rowsErr } = await supabase
      .from('checkins')
      .select('id, created_at')
      .eq('user_id', uid)
      .eq('is_baseline', true)
      .eq('type', 'visual')
      .order('created_at', { ascending: false });
    if (rowsErr) throw rowsErr;

    const ids = (baselineRows || []).map(r => r.id);

    if (ids.length > 0) {
      const { count, error: cntErr } = await supabase
        .from('checkin_photos')
        .select('id', { count: 'exact', head: true })
        .in('checkin_id', ids);
      if (cntErr) throw cntErr;

      // Case 2: already safe in the database.
      if ((count || 0) > 0) { apply(stripped()); return; }
    }

    // Case 3: nothing in the database. Create a baseline row if there is none,
    // then upload.
    let checkinId = ids[0];
    if (!checkinId) {
      const { data: created, error: insErr } = await supabase
        .from('checkins')
        .insert({
          user_id: uid,
          type: 'visual',
          symptoms: {},
          triage_result: null,
          is_baseline: true,
          notes: null,
        })
        .select('id')
        .single();
      if (insErr || !created) throw insErr || new Error('baseline row insert failed');
      checkinId = created.id;
    }

    const next = [...photos];

    for (let i = 0; i < next.length; i++) {
      const p = next[i];
      if (!p.dataUrl || p.storagePath) continue;

      const blob = await downscale(p.dataUrl);
      const path = `${uid}/baseline-${Date.now()}-${i}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;

            // Private bucket: store the path, signed at render time.
      const photoUrl = path;
      

      const { error: phErr } = await supabase.from('checkin_photos').insert({
        checkin_id: checkinId,
        user_id: uid,
                photo_url: photoUrl,
        region_tag: p.area || 'general',
      });
      if (phErr) throw phErr;

      const { dataUrl, ...rest } = p;
      next[i] = { ...rest, storagePath: path };
    }

    apply(next);
  } catch (e) {
    // Leave the dataUrls in memory and retry next load. They are not persisted
    // either way, so a failure here costs a retry, never the photos.
    console.error('[AppContext] baseline photo migration failed:', e);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Lazy initialiser: this used to be a bare loadState() call in the component
  // body, so a 1.4MB JSON.parse ran on every provider render and the result was
  // thrown away on all but the first. Now it runs exactly once.
  const [saved] = useState(loadState);

  // ── Auth user,pulled from Supabase session ───────────────
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'User',
        });
      }
    });

    // Keep user in sync with auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0] ||
              'User',
          });
        } else {
          setUser(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Routine last-updated timestamp ────────────────────────
  const [routineLastUpdated, setRoutineLastUpdated] = useState<number>(
    saved?.routineLastUpdated || Date.now(),
  );

  // ── Existing state ────────────────────────────────────────
  const [userName, setUserName]                           = useState<string>(saved?.userName || '');
  const [onboardingComplete, setOnboardingComplete]       = useState<boolean>(saved?.onboardingComplete || false);
  const [onboardingData, setOnboardingData]               = useState<OnboardingData>(saved?.onboardingData || defaultOnboarding);
  const [currentCheckIn, setCurrentCheckIn]               = useState<CheckInData | null>(saved?.currentCheckIn || null);
  const [checkInHistory, setCheckInHistory]               = useState<CheckInData[]>(saved?.checkInHistory || seed(demoCheckInHistory));
  const [riskOverride, setRiskOverride]                   = useState<'green' | 'amber' | 'red' | null>(saved?.riskOverride || null);
  const [stylistMode, setStylistMode]                     = useState<boolean>(saved?.stylistMode || false);
  const [salonVisits, setSalonVisits]                     = useState<SalonVisit[]>(saved?.salonVisits || seed(demoSalonVisits));
  const [clientObservations, setClientObservations]       = useState<ClientObservation[]>(saved?.clientObservations || seed(demoClientObservations));
  const [stylistLocations, setStylistLocations]           = useState<StylistLocation[]>(saved?.stylistLocations || defaultStylistLocations);
  const [healthProfile, setHealthProfile]                 = useState<HealthProfileData>(saved?.healthProfile || defaultHealthProfile);
  const [baselinePhotos, setBaselinePhotos]               = useState<BaselinePhoto[]>(saved?.baselinePhotos || []);
  const [baselineRisk, setBaselineRisk]                   = useState<'green' | 'amber' | 'red' | null>(saved?.baselineRisk || null);
  const [baselineDate, setBaselineDate]                   = useState<string | null>(saved?.baselineDate || null);
  const [quickLogs, setQuickLogs]                         = useState<QuickLogEntry[]>(saved?.quickLogs || []);
  const [research, setResearch]                           = useState<ResearchData>(saved?.research || { consented: false, consentDate: null, photoCount: 0, dismissed: false });
  const [checkInCount, setCheckInCount]                   = useState<number>(saved?.checkInCount ?? 0);
  const [progressiveDismissed, setProgressiveDismissed]   = useState<Record<string, boolean>>(saved?.progressiveDismissed || {});

  // ── One-shot baseline photo migration ─────────────────────
  const migratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    if (migratedFor.current === user.id) return;
    migratedFor.current = user.id;
    migrateBaselinePhotos(user.id, baselinePhotos, setBaselinePhotos);
    // Intentionally keyed on the user only. Re-running on every baselinePhotos
    // change would re-enter mid-upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persist to localStorage. saveState strips photo data URLs.
  useEffect(() => {
    saveState({
      userName, onboardingComplete, onboardingData, currentCheckIn,
      checkInHistory, riskOverride, stylistMode, salonVisits,
      clientObservations, stylistLocations, healthProfile,
      baselinePhotos, baselineRisk, baselineDate,
      quickLogs, research, checkInCount, progressiveDismissed,
      routineLastUpdated,
    });
  }, [
    userName, onboardingComplete, onboardingData, currentCheckIn,
    checkInHistory, riskOverride, stylistMode, salonVisits,
    clientObservations, stylistLocations, healthProfile,
    baselinePhotos, baselineRisk, baselineDate,
    quickLogs, research, checkInCount, progressiveDismissed,
    routineLastUpdated,
  ]);

  const addSalonVisit            = (v: SalonVisit) => setSalonVisits(prev => [v, ...prev]);
  const addClientObservation     = (o: ClientObservation) => setClientObservations(prev => [o, ...prev]);
  const addQuickLog              = (entry: QuickLogEntry) => setQuickLogs(prev => [entry, ...prev]);
  const addStylistLocation       = (loc: StylistLocation) => setStylistLocations(prev => [...prev, loc]);
  const removeStylistLocation    = (id: string) => setStylistLocations(prev => prev.filter(l => l.id !== id));
  const incrementResearchPhotos  = () => setResearch(prev => ({ ...prev, photoCount: prev.photoCount + 1 }));
  const addToCheckInHistory      = (c: CheckInData) => setCheckInHistory(prev => [c, ...prev]);
  const dismissProgressivePrompt = (key: string) => setProgressiveDismissed(prev => ({ ...prev, [key]: true }));

  const resetAll = () => {
    setUserName(''); setOnboardingComplete(false); setOnboardingData(defaultOnboarding);
    setCurrentCheckIn(null); setCheckInHistory([]); setRiskOverride(null); setStylistMode(false);
    setSalonVisits(seed(demoSalonVisits)); setClientObservations(seed(demoClientObservations));
    setStylistLocations(defaultStylistLocations); setHealthProfile(defaultHealthProfile);
    setBaselinePhotos([]); setBaselineRisk(null); setBaselineDate(null); setQuickLogs([]);
    setResearch({ consented: false, consentDate: null, photoCount: 0, dismissed: false });
    setCheckInCount(0); setProgressiveDismissed({});
    setRoutineLastUpdated(Date.now());
    migratedFor.current = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AppContext.Provider value={{
      user,
      routineLastUpdated,
      setRoutineLastUpdated,
      userName, setUserName,
      onboardingComplete, setOnboardingComplete,
      onboardingData, setOnboardingData,
      currentCheckIn, setCurrentCheckIn,
      checkInHistory, addToCheckInHistory,
      history: seed(demoHistory),
      salonVisits, addSalonVisit,
      riskOverride, setRiskOverride,
      stylistMode, setStylistMode,
      clientObservations, addClientObservation,
      stylistObservations: seed(demoStylistObservations),
      stylistLocations, setStylistLocations, addStylistLocation, removeStylistLocation,
      healthProfile, setHealthProfile,
      baselinePhotos, setBaselinePhotos,
      baselineRisk, setBaselineRisk,
      baselineDate, setBaselineDate,
      quickLogs, addQuickLog,
      research, setResearch, incrementResearchPhotos,
      checkInCount, setCheckInCount,
      progressiveDismissed, dismissProgressivePrompt,
      resetAll,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};