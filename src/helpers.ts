import { Filter } from 'https://deno.land/x/grammy@v1.10.1/filter.ts';
import { MyContext } from './index.ts';

export interface CallbackProcessor {
  dataRegex: string | RegExp;
  execute: (ctx: ContextType) => Promise<void>;
}

export type ContextType = Filter<MyContext, 'callback_query:data'>;

export const processCallbackQuery = (...processors: CallbackProcessor[]) => {
  return async (ctx: ContextType) => {
    const processor = processors.find((p) => ctx.callbackQuery.data.match(p.dataRegex));
    if (!processor) return;

    try {
      await processor.execute(ctx);
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
