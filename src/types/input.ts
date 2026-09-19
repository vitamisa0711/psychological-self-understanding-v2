/**
 * PsychologicalInput — LOCKED SPECIFICATION v1.0.0
 */

export interface PsychologicalInput {
  /** Raw user text (Vietnamese) */
  text: string;
  /** Optional existing session */
  sessionId?: string;
  /** Fixed to Vietnamese for MVP */
  language: "vi";
  /** Enforced max length from config */
  maxLength: number;
}
