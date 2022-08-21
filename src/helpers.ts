import { Filter } from 'https://deno.land/x/grammy@v1.10.1/filter.ts';
import { MyContext, Time } from './index.ts';

type ContextType = Filter<MyContext, 'callback_query:data'>;

export const processCallbackQuery = (middleware: (ctx: ContextType) => Promise<void>) => {
  return async (ctx: ContextType) => {
    try {
      await middleware(ctx);
    } catch (err) {
      console.error(`
        error occured while processing callback query "${ctx.callbackQuery}";
        error: ${err}
      `);

      // answer callback query whenever error is occurs to prevent
      // unresponsive bot behavior (e.g. long loading after pressing inline keyboard button)
      ctx.answerCallbackQuery({ text: 'error on server', show_alert: true });
    }
  };
};

export const msToTime = (milliseconds: number): Time => {
  const hours = milliseconds / 3600000;
  if (!Number.isInteger(hours)) {
    const int = parseInt(hours.toString());
    return { hours: int, minutes: Math.round((hours - int) * 60) };
  }
  return { hours, minutes: 0 };
};

/**
 * @returns time difference in milliseconds
 */
export const calcTimeDiff = (time1: Time, time2: Time): number => {
  const date1 = new Date();
  date1.setHours(time1.hours);
  date1.setMinutes(time1.minutes);

  const date2 = new Date();
  date2.setHours(time2.hours);
  date2.setMinutes(time2.minutes);

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
