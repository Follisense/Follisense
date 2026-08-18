// ---------------------------------------------------------------
// P1-7
//
// Chat is live-session only. The mutations that used to live here
// (createSession, saveSessionTitle, addUserMessage,
// addAssistantMessage) wrote message content and session titles to
// Convex, which put health data in a second store with no deletion
// path. They have been removed along with their tables.
//
// The conversation is held in React state on the client and passed
// to chatAction.sendMessage on each turn. Nothing is stored.
//
// Do not add persistence here. If something needs storing, it goes
// in Supabase.
// ---------------------------------------------------------------

export {};
