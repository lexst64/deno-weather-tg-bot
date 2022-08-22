import 'https://deno.land/std@0.152.0/dotenv/load.ts';
import { Bot, session } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { callbackQueryComposer } from './composers/callbackQueries.ts';
import { commandComposer } from './composers/commands.ts';
import { conversationComposer } from './composers/conversations.ts';
import { Openweathermap } from './api/openweather.api.ts';
import { TimeApi } from './api/time.api.ts';
import { BotContext, SessionData } from './types.ts';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN');
const OPENWEATHER_API = Deno.env.get('OPENWEATHER_API');
const TIMEZONEDB_TOKEN = Deno.env.get('TIMEZONEDB_TOKEN');
if (!BOT_TOKEN) throw new Error('no bot token');
if (!OPENWEATHER_API) throw new Error('no openweather api token');
if (!TIMEZONEDB_TOKEN) throw new Error('no timezonedb api token');

export const openweathermap = new Openweathermap(OPENWEATHER_API, 'metric');
export const timeApi = new TimeApi();

export const bot = new Bot<BotContext>(BOT_TOKEN);

bot.use(session({
  initial: (): SessionData => ({
    locations: [],
    notifTimes: [],
    timeoutId: 0,
  }),
  // TODO: check if ctx.from is undefined
  getSessionKey: (ctx) => ctx.from?.id.toString(),
}));

bot.use(conversationComposer);
bot.use(commandComposer);
bot.use(callbackQueryComposer);

bot.start({ onStart: () => console.log('bot has been started') });

bot.catch((err) => {
  console.log('something went wrong');
  console.error(err);
});
