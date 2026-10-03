/** Reads env once, lazily, so a missing key only breaks the feature that needs it. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get googleServiceAccountEmail() {
    return required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  get googleServiceAccountPrivateKey() {
    return required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\n/g, "\n");
  },
  get spreadsheetId() {
    return required("GOOGLE_SHEETS_SPREADSHEET_ID");
  },
  get authSecret() {
    return process.env.AUTH_SECRET || "tagbill-dev-secret-change-me";
  },
  get appPasscode() {
    return process.env.APP_PASSCODE || "1234";
  },
  get driveFolderId() {
    return process.env.GOOGLE_DRIVE_TAGS_FOLDER_ID || "";
  },
};

/** True when a real spreadsheet is configured; otherwise the app uses the local JSON store. */
export function sheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

export function driveConfigured(): boolean {
  return sheetsConfigured() && !!process.env.GOOGLE_DRIVE_TAGS_FOLDER_ID;
}

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
