/**
 * Privacy-safe safety logging metadata — PHASE 3
 * Never accepts raw psychological text.
 */

export interface SafetyLogMetadata {
  requestId?: string;
  sessionId?: string;
  riskLevel: string;
  action: string;
  classifierVersion: string;
  safetyVersion: string;
  signalCategories?: string[];
  /** never raw text */
}

/**
 * Build log payload. Rejects any attempt to pass raw text fields.
 */
export function buildSafetyLogMetadata(
  meta: SafetyLogMetadata
): SafetyLogMetadata {
  const clean: SafetyLogMetadata = {
    riskLevel: meta.riskLevel,
    action: meta.action,
    classifierVersion: meta.classifierVersion,
    safetyVersion: meta.safetyVersion,
  };
  if (meta.requestId) clean.requestId = meta.requestId;
  if (meta.sessionId) clean.sessionId = meta.sessionId;
  if (meta.signalCategories) clean.signalCategories = [...meta.signalCategories];
  return clean;
}
