import { z } from 'zod';

const NotificationPayloadSchema = z
  .object({
    hook_event_name: z.coerce.string().optional(),
    message: z.coerce.string().optional(),
    transcript_path: z.coerce.string().optional()
  })
  .passthrough();

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

export interface ParsedPayloadResult {
  payload: NotificationPayload | null;
  rawJson: unknown | null;
  wasJson: boolean;
}

export function parseNotificationPayload(rawPayload: string): ParsedPayloadResult {
  try {
    const jsonPayload = JSON.parse(rawPayload);

    if (typeof jsonPayload !== 'object' || jsonPayload === null) {
      return {
        payload: null,
        rawJson: jsonPayload,
        wasJson: true
      };
    }

    const parsed = NotificationPayloadSchema.safeParse(jsonPayload);

    return {
      payload: parsed.success ? parsed.data : null,
      rawJson: jsonPayload,
      wasJson: true
    };
  } catch {
    return {
      payload: null,
      rawJson: null,
      wasJson: false
    };
  }
}

export function deriveProjectName(transcriptPath?: string): string {
  if (!transcriptPath) {
    return 'unknown project';
  }

  const dashedMatch = transcriptPath.match(/projects\/[^/]*-([^/]+)\//);
  if (dashedMatch) {
    return dashedMatch[1].replace(/-/g, ' ');
  }

  const plainMatch = transcriptPath.match(/projects\/([^/]+)\//);
  if (plainMatch) {
    return plainMatch[1].replace(/-/g, ' ').replace(/\./g, ' dot ');
  }

  return 'unknown project';
}

export function buildSpeechMessage(
  projectName: string,
  hookEventName?: string,
  message?: string
): string {
  if (hookEventName === 'Stop') {
    return `In ${projectName}, Claude completed a task`;
  }

  const cleanMessage = (message ?? 'Notification received').replace(/Claude Code/g, 'Claude');
  return `In ${projectName}, ${cleanMessage}`;
}

export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
