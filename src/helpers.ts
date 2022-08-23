import { Filter } from 'https://deno.land/x/grammy@v1.10.1/filter.ts';
import { InlineKeyboardMarkup } from 'https://deno.land/x/grammy@v1.10.1/platform.deno.ts';
import { BotContext, Time } from './types.ts';

type CallbackQueryContext = Filter<BotContext, 'callback_query:data'>;

export const processCallbackQuery = (middleware: (ctx: CallbackQueryContext) => Promise<void>) => {
  return async (ctx: CallbackQueryContext) => {
    try {
      await middleware(ctx);
    } catch (err) {
      console.error(`
        error occured while processing callback query "${ctx.callbackQuery}";
        error: ${err}
      `);

      // it's important to answer callback query whenever error is occured to prevent
      // unresponsive bot behavior (e.g. long loading after pressing inline keyboard button)
      ctx.answerCallbackQuery({ text: 'error on server', show_alert: true });
    }
  };
};

export const msToTime = (milliseconds: number): Time => {
  let hours = milliseconds / 3600000;
  let minutes = 0;
  let seconds = 0;

  if (!Number.isInteger(hours)) {
    const int = parseInt(hours.toString());
    minutes = (hours - int) * 60;
    hours = int;
  }
  if (!Number.isInteger(minutes)) {
    const int = parseInt(minutes.toString());
    seconds = Math.round((minutes - int) * 60);
    minutes = int;
  }

  return { hours, minutes, seconds };
};

export const timeToDate = (time: Time) => {
  const date = new Date();
  date.setHours(time.hours);
  date.setMinutes(time.minutes);
  date.setSeconds(time.seconds);
  return date;
};

/**
 * @returns difference beetween two times in milliseconds
 */
export const calcTimeDiff = (time1: Time, time2: Time): number => {
  const date1 = timeToDate(time1);
  const date2 = timeToDate(time2);

  if (date1 >= date2) {
    date2.setDate(date2.getDate() + 1);
  }

  // @ts-ignore: it's possible to subtract Date objects
  return date2 - date1;
};

/**
 * Finds the nearest time from the provided `times` to the provided `baseTime`.
 *
 * @param baseTime the time relative to which the provided times are compared.
 * @param times the times that are compared to the `baseTime`
 * @returns {Time} the found time from the `times`
 */
export const findNearestTime = (baseTime: Time, times: Time[]): Time => {
  return times
    .map((time) => ({ diff: calcTimeDiff(baseTime, time), time }))
    .sort((a, b) => a.diff - b.diff)[0].time;
};

export const createLocationReplyMarkup = (locationId: string): InlineKeyboardMarkup => {
  return {
    inline_keyboard: [
      [
        { text: 'delete', callback_data: `delete_location#${locationId}` },
      ],
    ],
  };
};
