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
