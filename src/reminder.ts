#!/usr/bin/env node
/**
 * Reminder Background Process
 *
 * Spawned by the notification hook when an alert is set.
 * Runs in the background, checking periodically if the alert is still pending.
 * Re-announces if the alert is stale.
 *
 * Usage: tsx reminder.ts <sessionId>
 */

import { alerts } from './core/alerts';
import { config, renderTemplate } from './core/config';
import { speak } from './core/speak';
import { history } from './core/history';

const sessionIdArg = process.argv[2];

if (!sessionIdArg) {
  console.error('[reminder] No sessionId provided');
  process.exit(1);
}

// Now sessionId is guaranteed to be a string
const sessionId: string = sessionIdArg;

async function main(): Promise<void> {
  const alertConfig = config.getAlertConfig();
  const reminderMs = alertConfig.reminderMinutes * 60 * 1000;
  const maxReminders = alertConfig.maxReminders;
  const urgentAfterMinutes = alertConfig.urgentAfterMinutes;

  console.error(`[reminder] Started for session ${sessionId.slice(0, 8)}...`);
  console.error(`[reminder] Config: remind every ${alertConfig.reminderMinutes}m, max ${maxReminders}, urgent after ${urgentAfterMinutes}m`);

  let reminderCount = 0;

  while (true) {
    // Wait for reminder interval
    await sleep(reminderMs);

    // Check if alert still exists
    const alert = alerts.get(sessionId);

    if (!alert) {
      // Alert was cleared (user responded) - exit
      console.error(`[reminder] Alert cleared for ${sessionId.slice(0, 8)}, exiting`);
      break;
    }

    // Check max reminders
    if (maxReminders > 0 && reminderCount >= maxReminders) {
      console.error(`[reminder] Max reminders (${maxReminders}) reached for ${sessionId.slice(0, 8)}, exiting`);
      break;
    }

    // Increment reminder count
    reminderCount = alerts.incrementReminder(sessionId);
    const minutes = alerts.getAgeMinutes(alert);

    console.error(`[reminder] Reminder #${reminderCount} for ${sessionId.slice(0, 8)} (${minutes}m old)`);

    // Check if we should escalate (time-based, 0 = never)
    const shouldEscalate = urgentAfterMinutes > 0 && minutes >= urgentAfterMinutes;

    if (shouldEscalate) {
      // Escalation reminder - only show minutes if >= 10
      const minutesSuffix = minutes >= 10 ? ` ${minutes} minutes.` : '';
      const message = renderTemplate('alertEscalation', {
        project: alert.project,
        type: alert.type,
        minutes,
        minutesSuffix,
      });
      await speak(message, { priority: 'high', sessionId });

      // Log to history
      history.log({
        type: 'reminder',
        project: alert.project,
        session_id: sessionId,
        message,
        payload: {
          reminder_number: reminderCount,
          escalated: true,
          age_minutes: minutes,
          alert_type: alert.type,
        },
      });

      console.error(`[reminder] ESCALATION: ${message}`);
    } else {
      // Normal reminder
      const message = renderTemplate('alertReminder', {
        project: alert.project,
        type: alert.type,
        minutes,
      });
      await speak(message, { sessionId });

      // Log to history
      history.log({
        type: 'reminder',
        project: alert.project,
        session_id: sessionId,
        message,
        payload: {
          reminder_number: reminderCount,
          escalated: false,
          age_minutes: minutes,
          alert_type: alert.type,
        },
      });

      console.error(`[reminder] Spoke: ${message}`);
    }
  }

  console.error(`[reminder] Process ending for ${sessionId.slice(0, 8)}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error(`[reminder] Fatal error: ${error}`);
  process.exit(1);
});
