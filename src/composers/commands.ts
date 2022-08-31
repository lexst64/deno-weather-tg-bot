import { Composer } from 'https://deno.land/x/grammy@v1.10.1/composer.ts';
import { CommandContext } from 'https://deno.land/x/grammy@v1.10.1/context.ts';
import {
  calcTimeDiff,
  createLocationReplyMarkup,
  createSuggestedTimeZonaReplyMarkup,
  findNearestTime,
  msToTime,
} from '../helpers.ts';
import { openweathermap, timeApi } from '../index.ts';
import { BotContext, Location, Time } from '../types.ts';

const composer = new Composer<BotContext>();

const weatherNow = (ctx: CommandContext<BotContext>) => {
  ctx.session.locations.forEach(async ({ name, lat, lon }: Location) => {
    const data = await openweathermap.currentWeather(lat, lon);
    ctx.reply(
      `
<b>${name}</b>\n
Weather: ${data.weather[0].main}, ${data.weather[0].description}
Temp: ${data.main.temp}, feels like ${data.main.feels_like}
Wind: ${data.wind.speed}, ${data.wind.deg}
Cloudiness: ${data.clouds.all}
    `,
      { parse_mode: 'HTML' },
    );
  });
};

composer.command('weather_now', weatherNow);

composer.command('add_location', async (ctx) => {
  await ctx.conversation.reenter('addLocation');
});

composer.command('locations', async (ctx) => {
  if (!ctx.session.locations.length) {
    await ctx.reply('you have no saved locations: /add_location');
    return;
  }
  ctx.session.locations.forEach(async ({ name, id }: Location) => {
    await ctx.reply(name, { reply_markup: createLocationReplyMarkup(id) });
  });
});

composer.command('add_notif_time', async (ctx) => {
  await ctx.conversation.reenter('addNotifTime');
});

composer.command('set_time_zone', async (ctx) => {
  if (!ctx.session.locations.length) {
    await ctx.reply('you have no saved locations: /add_location');
    return;
  }

  await ctx.reply('select location which time zone you would like to use');

  ctx.session.suggestedTimeZones = [];

  ctx.session.locations.forEach(async (location) => {
    const { time, timeZone } = await timeApi.currentTimeByCoords(location.lat, location.lon);
    const id = crypto.randomUUID();
    const messageId = (await ctx.reply(
      `${location.name}, ${time}, ${timeZone}`,
      { reply_markup: createSuggestedTimeZonaReplyMarkup(id) },
    )).message_id;

    ctx.session.suggestedTimeZones.push({ id, messageId, timeZone });
  });
});

composer.command('time_zone', async (ctx) => {
  if (!ctx.session.timeZone) {
    await ctx.reply(`you haven't set time zone: /set_time_zone`);
    return;
  }
  const data = await timeApi.currentTimeByTimeZone(ctx.session.timeZone);
  await ctx.reply(`${ctx.session.timeZone}, ${data.time}`);
});

composer.command('notif_on', async (ctx) => {
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
  if (!ctx.session.timeZone) {
    await ctx.reply(`you haven't set time zone: /set_time_zone`);
    return;
  }

  let userDate: Date;
  try {
    const data = await timeApi.currentTimeByTimeZone(ctx.session.timeZone);
    userDate = new Date(data.dateTime);
  } catch (error) {
    console.error(error);
    await ctx.reply('Unable to turn on notifications :( Something went wrong');
    return;
  }

  const userTime: Time = {
    hours: userDate.getHours(),
    minutes: userDate.getMinutes(),
    seconds: userDate.getSeconds(),
  };
  const notifTime: Time = findNearestTime(userTime, ctx.session.notifTimes);

  const setNotificationTimeout = (notifTime: Time, delay: number) => {
    if (!ctx.session.notifTimes.length) return;

    ctx.session.timeoutId = setTimeout(() => {
      weatherNow(ctx);
      const nextNotifTime: Time = findNearestTime(notifTime, ctx.session.notifTimes);
      setNotificationTimeout(nextNotifTime, calcTimeDiff(notifTime, nextNotifTime));
    }, delay);
  };

  const timeDiff = calcTimeDiff(userTime, notifTime);
  setNotificationTimeout(notifTime, timeDiff);

  const timeLeft: Time = msToTime(timeDiff);
  await ctx.reply(`
Notifications on.
${timeLeft.hours > 0 ? timeLeft.hours + ' hr ' : ''}${
    timeLeft.minutes > 0 ? timeLeft.minutes + ' min ' : ''
  }${timeLeft.seconds > 0 ? timeLeft.seconds + ' sec ' : ''} left till the next notification
  `);
});

composer.command('notif_off', async (ctx) => {
  if (ctx.session.timeoutId === 0) {
    await ctx.reply('notifications already turned off');
    return;
  }
  clearTimeout(ctx.session.timeoutId);
  ctx.session.timeoutId = 0;
  await ctx.reply('All notifications have been turned off');
});

composer.command('notif_times', async (ctx) => {
  if (!ctx.session.notifTimes.length) {
    await ctx.reply('you have no added notification times: /add_notif_time');
    return;
  }
  ctx.session.notifTimes.forEach(async (time) => await ctx.reply(`${time.hours}:${time.minutes}`));
});

export { composer as commandComposer };
