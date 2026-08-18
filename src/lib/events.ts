// src/lib/events.ts
//
// Every analytics event the app sends, named in one place.
//
// THE RULE, from the roadmap's standing rules: event names and IDs only.
// Never a symptom value, never a photo URL, never a score, never free text the
// user typed. PostHog is a third party and this is health data. If you are
// unsure whether a property belongs here, it does not.
//
// Counts and booleans are fine (how many photos, whether it was a baseline).
// The thing itself is not (which symptom, what severity).
//
// NOTE: analytics.ts sets opt_out_capturing_by_default, so none of these fire
// until grantAnalyticsConsent() has been called from the cookie banner. That is
// deliberate, but it does mean the banner has to exist before any of this
// produces data.

import { track, identifyUser, resetUser } from '@/lib/analytics';

export const EVENTS = {
  // ── Acquisition ──────────────────────────────────────────────────────
  SIGNED_UP:            'signed_up',
  LOGGED_IN:            'logged_in',

  // ── Onboarding funnel ────────────────────────────────────────────────
  ONBOARDING_STARTED:   'onboarding_started',
  BASELINE_PHOTOS_DONE: 'baseline_photos_captured',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // ── The retention loop. P2-3's number comes from these. ──────────────
  CHECK_IN_COMPLETED:   'check_in_completed',
  PROGRESS_PHOTO_ADDED: 'progress_photo_added',

  // ── Surfaces ─────────────────────────────────────────────────────────
  REPORT_VIEWED:        'report_viewed',
  ARTICLE_OPENED:       'article_opened',
  PRODUCT_CLICKED:      'product_clicked',
  STYLE_CYCLE_STARTED:  'style_cycle_started',
} as const;

// ─── Typed helpers ────────────────────────────────────────────────────────
// One function per event, so a call site cannot invent a property name or
// accidentally pass something it should not.

export const trackSignedUp = (method: 'email' | 'google') =>
  track(EVENTS.SIGNED_UP, { method });

export const trackLoggedIn = (method: 'email' | 'google') =>
  track(EVENTS.LOGGED_IN, { method });

export const trackOnboardingStarted = () =>
  track(EVENTS.ONBOARDING_STARTED);

/** photo_count only. Never the photos, never the areas' contents. */
export const trackBaselinePhotos = (photoCount: number) =>
  track(EVENTS.BASELINE_PHOTOS_DONE, { photo_count: photoCount });

/** Which flow they came through, and whether they gave photos. No answers. */
export const trackOnboardingCompleted = (opts: {
  gender: string;
  hasPhotos: boolean;
}) =>
  track(EVENTS.ONBOARDING_COMPLETED, {
    gender: opts.gender,
    has_photos: opts.hasPhotos,
  });

/**
 * The event P2-3 is built on: of users who completed a baseline, what
 * proportion completed a second check-in within their expected window.
 *
 * `type` is the flow, not the content. `is_baseline` separates the onboarding
 * baseline from a real check-in, the same distinction HomePage already makes
 * when counting. No symptom values, no scores, no risk level.
 */
export const trackCheckInCompleted = (opts: {
  type: 'mid_cycle' | 'wash_day' | 'baseline' | 'scheduled';
  isBaseline: boolean;
  photoCount?: number;
}) =>
  track(EVENTS.CHECK_IN_COMPLETED, {
    type: opts.type,
    is_baseline: opts.isBaseline,
    photo_count: opts.photoCount ?? 0,
  });

export const trackProgressPhotoAdded = () =>
  track(EVENTS.PROGRESS_PHOTO_ADDED);

export const trackReportViewed = (variant: 'patient' | 'clinician') =>
  track(EVENTS.REPORT_VIEWED, { variant });

/** Article id, not its content. */
export const trackArticleOpened = (articleId: string) =>
  track(EVENTS.ARTICLE_OPENED, { article_id: articleId });

/** Product id and where the click came from. Never the user's symptoms. */
export const trackProductClicked = (opts: { productId: string; surface: string }) =>
  track(EVENTS.PRODUCT_CLICKED, {
    product_id: opts.productId,
    surface: opts.surface,
  });

/** Style name and planned length are routine facts, not health data. */
export const trackStyleCycleStarted = (opts: { style: string; days: number }) =>
  track(EVENTS.STYLE_CYCLE_STARTED, {
    style: opts.style,
    planned_days: opts.days,
  });

// ─── Identity ─────────────────────────────────────────────────────────────
// Call on sign-in so events belong to a person rather than a browser, and on
// sign-out so the next user on a shared device is not merged into the first.

export const identifyOnLogin = (userId: string) => identifyUser(userId);
export const resetOnLogout = () => resetUser();