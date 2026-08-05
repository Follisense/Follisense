import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
const HOST = import.meta.env.VITE_POSTHOG_HOST

let started = false

export function initAnalytics() {
  if (started || !KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
    capture_pageleave: false,
    person_profiles: 'identified_only',
    opt_out_capturing_by_default: true,
    persistence: 'localStorage+cookie',
  })
  started = true
}

export function grantAnalyticsConsent() {
  initAnalytics()
  posthog.opt_in_capturing()
}

export function revokeAnalyticsConsent() {
  if (!started) return
  posthog.opt_out_capturing()
  posthog.reset()
}

export function identifyUser(userId: string) {
  if (!started) return
  posthog.identify(userId)
}

export function resetUser() {
  if (!started) return
  posthog.reset()
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (!started) return
  posthog.capture(event, props)
}