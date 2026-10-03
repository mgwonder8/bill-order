import { google } from "googleapis";
import { env } from "@/lib/env";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

let authClient: InstanceType<typeof google.auth.JWT> | null = null;

function getAuth() {
  if (!authClient) {
    authClient = new google.auth.JWT({
      email: env.googleServiceAccountEmail,
      key: env.googleServiceAccountPrivateKey,
      scopes: SCOPES,
    });
  }
  return authClient;
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}
