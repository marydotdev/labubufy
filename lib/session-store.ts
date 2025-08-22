// Session storage for multi-step generation
// In production, this would be replaced with a database

export interface GenerationSession {
  step1_prediction_id: string;
  step2_prediction_id?: string;
  labubu_id: number;
  user_image: string;
  labubu_name: string;
  step1_output?: string;
  final_output?: string;
  status: 'step1_processing' | 'step1_complete' | 'step2_processing' | 'completed' | 'failed';
  error?: string;
  created_at: number;
}

// In-memory session store (for development)
// In production, use Redis, database, or other persistent storage
const sessionStore = new Map<string, GenerationSession>();

export const generationSessions = {
  set: (id: string, session: GenerationSession) => {
    sessionStore.set(id, session);
  },
  
  get: (id: string): GenerationSession | undefined => {
    return sessionStore.get(id);
  },
  
  delete: (id: string): boolean => {
    return sessionStore.delete(id);
  },
  
  has: (id: string): boolean => {
    return sessionStore.has(id);
  },
  
  // Clean up old sessions (older than 1 hour)
  cleanup: () => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, session] of sessionStore.entries()) {
      if (session.created_at < oneHourAgo) {
        sessionStore.delete(id);
      }
    }
  }
};

// Clean up old sessions every 10 minutes
setInterval(() => {
  generationSessions.cleanup();
}, 10 * 60 * 1000);