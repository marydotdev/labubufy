// ROBUST lib/session-store.ts with HMR protection
// Session storage for multi-step generation

export interface GenerationSession {
  step1_prediction_id: string;
  step2_prediction_id?: string;
  labubu_id: number;
  user_image: string;
  labubu_name: string;
  step1_output?: string;
  final_output?: string;
  status:
    | "step1_processing"
    | "step1_complete"
    | "step2_processing"
    | "completed"
    | "failed";
  error?: string;
  created_at: number;
}

// Create a global session store that survives HMR in development
declare global {
  var __labubufy_sessions: Map<string, GenerationSession> | undefined;
}

// Use global store to survive Hot Module Reload in development
const sessionStore =
  globalThis.__labubufy_sessions ?? new Map<string, GenerationSession>();
if (process.env.NODE_ENV === "development") {
  globalThis.__labubufy_sessions = sessionStore;
}

export const generationSessions = {
  set: (id: string, session: GenerationSession) => {
    console.log(`📝 SESSION: Setting session ${id}`, session.status);
    sessionStore.set(id, session);
    console.log(`📝 SESSION: Total sessions now: ${sessionStore.size}`);
  },

  get: (id: string): GenerationSession | undefined => {
    const session = sessionStore.get(id);
    console.log(
      `📖 SESSION: Getting session ${id} - found: ${!!session}, status: ${
        session?.status
      }`
    );
    if (!session) {
      console.log(
        `📖 SESSION: Available sessions:`,
        Array.from(sessionStore.keys())
      );
    }
    return session;
  },

  delete: (id: string): boolean => {
    console.log(`🗑️ SESSION: Deleting session ${id}`);
    const result = sessionStore.delete(id);
    console.log(`🗑️ SESSION: Total sessions now: ${sessionStore.size}`);
    return result;
  },

  has: (id: string): boolean => {
    const exists = sessionStore.has(id);
    console.log(`🔍 SESSION: Checking if session ${id} exists: ${exists}`);
    return exists;
  },

  keys: (): IterableIterator<string> => {
    return sessionStore.keys();
  },

  size: (): number => {
    return sessionStore.size;
  },

  // Debug method to see all sessions
  getAllSessions: (): Array<{ id: string; status: string }> => {
    const sessions = Array.from(sessionStore.entries()).map(
      ([id, session]) => ({
        id,
        status: session.status,
      })
    );
    console.log(`🔍 SESSION: All sessions (${sessions.length}):`, sessions);
    return sessions;
  },

  // Clean up old sessions (older than 1 hour)
  cleanup: () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleanedCount = 0;
    for (const [id, session] of sessionStore.entries()) {
      if (session.created_at < oneHourAgo) {
        sessionStore.delete(id);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`🧹 SESSION: Cleaned up ${cleanedCount} old sessions`);
    }
  },
};

// Clean up old sessions every 10 minutes
if (typeof window === "undefined") {
  // Only on server
  setInterval(() => {
    generationSessions.cleanup();
  }, 10 * 60 * 1000);
}
