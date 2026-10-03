export const env = {
  get authSecret() {
    return process.env.AUTH_SECRET || "tagbill-dev-secret-change-me";
  },
  get appPasscode() {
    return process.env.APP_PASSCODE || "1234";
  },
};

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
