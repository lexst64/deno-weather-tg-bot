import 'https://deno.land/std@0.152.0/dotenv/load.ts';
import {
  Bot,
  CommandContext,
  Context,
  session,
  SessionFlavor,
} from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { InlineKeyboardMarkup, Message } from 'https://deno.land/x/grammy@v1.10.1/platform.deno.ts';
import {
  Conversation,
  ConversationFlavor,
  conversations,
  createConversation,
} from 'https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts';
import { calcTimeDiff, findNearestTime, msToTime, processCallbackQuery } from './helpers.ts';
import { Openweathermap, ReverseGeocoding } from './openweather.api.ts';
import { TimeApi } from './time.api.ts';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN');
const OPENWEATHER_API = Deno.env.get('OPENWEATHER_API');
const TIMEZONEDB_TOKEN = Deno.env.get('TIMEZONEDB_TOKEN');
if (!BOT_TOKEN) throw new Error('no bot token');
if (!OPENWEATHER_API) throw new Error('no openweather api token');
if (!TIMEZONEDB_TOKEN) throw new Error('no timezonedb api token');

export const openweathermap = new Openweathermap(OPENWEATHER_API, 'metric');
const timeApi = new TimeApi();

export interface Location {
  id: string;
  lat: number;
  lon: number;
}

export interface Time {
  hours: number;
  minutes: number;
}

interface SessionData {
  locations: Location[];
  notifTimes: Time[];
  timeoutId: number;
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

export const fetchLocationName = async (lat: number, lon: number): Promise<string> => {
  const data: ReverseGeocoding[] = await openweathermap.reverseGeocoding(lat, lon);
  const { name: city, state, country } = data[0];
  return state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
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

type MyConversation = Conversation<MyContext>;

const addLocation = async (conversation: MyConversation, ctx: MyContext) => {
  await ctx.reply('please, send your location');
  ctx = await conversation.waitFor('message:location', async (ctx) => {
    await ctx.reply('it is not a location :(');
  });
  const location: Location = {
    lat: ctx.message!.location!.latitude,
    lon: ctx.message!.location!.longitude,
    id: await conversation.external(() => crypto.randomUUID()),
  };

  ctx.session.locations.push(location);
  const locationName: string = await conversation.external(() =>
    fetchLocationName(location.lat, location.lon)
  );
  return await ctx.reply(
    `Location '${locationName}' has been added to your location list. /locations - to see the whole list`,
  );
};

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const addNotifTime = async (conversation: MyConversation, ctx: MyContext) => {
  await ctx.reply('please, send notification time');

  while (true) {
    ctx = await conversation.waitFor('message:text', async (ctx) => {
      await ctx.reply('it is not a time :(');
    });
    if (timeRegex.test(ctx!.message!.text || '')) {
      break;
    }
    await ctx.reply('time does not meet the pattern, try again');
  }

  const time: string = ctx!.message!.text as string;
  ctx.session.notifTimes.push({
    hours: parseInt(time.split(':')[0]),
    minutes: parseInt(time.split(':')[1]),
  });
  await ctx.reply(`Time '${time}' has been added to notification time list: /notif_times`);
};

export const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(session({
  initial: (): SessionData => ({
    locations: [],
    notifTimes: [],
    timeoutId: 0,
  }),
  getSessionKey: (ctx) => ctx.from?.id.toString(),
}));

bot.use(conversations());
bot.use(createConversation(addLocation));
bot.use(createConversation(addNotifTime));

bot.command('locations', async (ctx) => {
  if (!ctx.session.locations.length) {
    await ctx.reply('you have no saved locations: /add_location');
    return;
  }
  ctx.session.locations.forEach(async ({ lat, lon, id }: Location) => {
    const locationName = await fetchLocationName(lat, lon);
    await ctx.reply(locationName, { reply_markup: createLocationReplyMarkup(id) });
  });
});

bot.command('add_location', async (ctx) => {
  await ctx.conversation.reenter('addLocation');
});

const currentWeather = (ctx: CommandContext<MyContext>) => {
  ctx.session.locations.forEach(async ({ lat, lon }: Location) => {
    const data = await openweathermap.currentWeather(lat, lon);
    const locationName = await fetchLocationName(lat, lon);
    await ctx.reply(
      `
<b>${locationName}</b>\n
Weather: ${data.weather[0].main}, ${data.weather[0].description}
Temp: ${data.main.temp}, feels like ${data.main.feels_like}
Wind: ${data.wind.speed}, ${data.wind.deg}
Cloudiness: ${data.clouds.all}
		`,
      { parse_mode: 'HTML' },
    );
  });
};

bot.command('weather_now', currentWeather);

bot.command('add_notif_time', async (ctx) => {
  await ctx.conversation.reenter('addNotifTime');
});

bot.command('notif_on', async (ctx) => {
  if (ctx.session.timeoutId != 0) {
    await ctx.reply('notificaitons already turned on');
    return;
  }
  if (!ctx.session.locations.length) {
    await ctx.reply('you have no saved locations: /add_location');
    return;
  }
  if (!ctx.session.notifTimes.length) {
    await ctx.reply('you have no added notification times: /add_notif_time');
    return;
  }

  let data;
  try {
    const location = ctx.session.locations[0];
    data = await timeApi.currentTime(location.lat, location.lon);
  } catch (error) {
    console.error(error);
    return;
  }
  const userDate = new Date(data.dateTime);
  const userTime: Time = { hours: userDate.getHours(), minutes: userDate.getMinutes() };
  const notifTime: Time = findNearestTime(userTime, ctx.session.notifTimes);

  const setNotificationTimeout = (notifTime: Time, delay: number) => {
    if (!ctx.session.notifTimes.length) return;

    ctx.session.timeoutId = setTimeout(() => {
      currentWeather(ctx);
      const nextNotifTime: Time = findNearestTime(notifTime, ctx.session.notifTimes);
      setNotificationTimeout(nextNotifTime, calcTimeDiff(notifTime, nextNotifTime));
    }, delay);
  };

  const timeDiff = calcTimeDiff(userTime, notifTime);
  setNotificationTimeout(notifTime, timeDiff);

  const timeLeft: Time = msToTime(timeDiff);
  await ctx.reply(`
Notifications on.
${
    timeLeft.hours > 0
      ? timeLeft.hours + 'h '
      : ''
  }${timeLeft.minutes}min left till the next notification
	`);
});

bot.command('notif_off', async (ctx) => {
  if (ctx.session.timeoutId === 0) {
    await ctx.reply('notifications already turned off');
    return;
  }
  clearTimeout(ctx.session.timeoutId);
  ctx.session.timeoutId = 0;
  await ctx.reply('All notifications have been turned off');
});

bot.command('notif_times', async (ctx) => {
  if (!ctx.session.notifTimes.length) {
    await ctx.reply('you have no added notification times: /add_notif_time');
    return;
  }
  ctx.session.notifTimes.forEach(async (time) => await ctx.reply(`${time.hours}:${time.minutes}`));
});

const UUIDRegex = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

bot.callbackQuery(
  new RegExp(`^delete_location#${UUIDRegex.source}$`),
  processCallbackQuery(async (ctx) => {
    const locationId = ctx.callbackQuery.data.split('#')[1];
    ctx.session.locations = ctx.session.locations.filter((location: Location) =>
      location.id !== locationId
    );

    const message: Message | undefined = ctx.callbackQuery.message;
    if (message) await ctx.deleteMessage();
    await ctx.answerCallbackQuery({ text: 'location has been deleted' });
  }),
);

bot.start({ onStart: () => console.log('bot has been started') });

bot.catch((err) => {
  console.log('something went wrong');
  console.error(err);
});
