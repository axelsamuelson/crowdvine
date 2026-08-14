/**
 * Back-compat re-exports. Prefer `emitOnce` / helpers from `./emit-once`.
 */
export {
  CHECKOUT_STARTED_KEY,
  SIGNUP_STARTED_CHECKOUT_KEY,
  SIGNUP_COMPLETED_PREFIX,
  claimOnce,
  clearClaim,
  emitOnce,
  claimSignupCompletedOnce,
  getCheckoutSessionId,
  clearCheckoutAnalyticsSession,
  ageVerificationShownKey,
  ageVerificationPassedKey,
  termsAcceptedEmitKey,
  deliveryCapturedEmitKey,
  contactCapturedEmitKey,
} from "./emit-once";
