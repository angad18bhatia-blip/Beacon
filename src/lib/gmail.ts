import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// Loads the signed-in student's Google account tokens, refreshing the
// access token via the stored refresh token if it has expired, and
// persists the refreshed token so we don't have to do this every send.
export async function getGoogleClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token || !account.refresh_token) {
    throw new Error(
      "No linked Google account with mail-send permission found. Please sign in again and grant access.",
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  const isExpired =
    !account.expires_at || account.expires_at * 1000 < Date.now();

  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : null,
      },
    });
  }

  return oauth2Client;
}

function encodeBase64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage(opts: {
  fromName: string | null;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
}) {
  const from = opts.fromName
    ? `${opts.fromName} <${opts.fromEmail}>`
    : opts.fromEmail;

  const lines = [
    `From: ${from}`,
    `To: ${opts.toName} <${opts.toEmail}>`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.body,
  ];

  return lines.join("\r\n");
}

export async function sendGmail(opts: {
  userId: string;
  fromName: string | null;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
}) {
  const auth = await getGoogleClient(opts.userId);
  const gmail = google.gmail({ version: "v1", auth });

  const raw = encodeBase64Url(buildMimeMessage(opts));

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return res.data;
}

export type ReplyCheck =
  | { hasReply: true; snippet: string; repliedAt: Date }
  | { hasReply: false };

// Reads the thread this app started (via the stored threadId) and checks
// whether it now contains a message the student didn't send themselves —
// i.e. a reply. Read-only: never touches, labels, or deletes anything.
export async function checkForReply(
  userId: string,
  studentEmail: string,
  threadId: string,
): Promise<ReplyCheck> {
  const auth = await getGoogleClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "Date"],
  });

  const messages = res.data.messages ?? [];
  const studentAddress = studentEmail.toLowerCase();

  for (const message of messages) {
    const fromHeader = message.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === "from",
    )?.value;
    if (fromHeader && !fromHeader.toLowerCase().includes(studentAddress)) {
      const dateHeader = message.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === "date",
      )?.value;
      return {
        hasReply: true,
        snippet: message.snippet ?? "",
        repliedAt: dateHeader ? new Date(dateHeader) : new Date(),
      };
    }
  }

  return { hasReply: false };
}
