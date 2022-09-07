import { Composer } from 'https://deno.land/x/grammy@v1.10.1/composer.ts';
import { Location } from 'https://deno.land/x/grammy@v1.10.1/platform.deno.ts';
import {
  conversations,
  createConversation,
} from 'https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts';
import { Geocoding } from '../api/openweather/types.ts';
import { createSuggestedLocationReplyMarkup } from '../helpers.ts';
import { openweathermap } from '../index.ts';
import { BotContext, BotConversation } from '../types.ts';

const composer = new Composer<BotContext>();

const fetchGeocodings = async (location: string | Location): Promise<Geocoding[]> => {
  let geocodings: Geocoding[];

  try {
    if (typeof location === 'string') {
      geocodings = await openweathermap.geocoding(location);
    } else {
      geocodings = await openweathermap.reverseGeocoding(location.latitude, location.longitude);
    }
  } catch (e) {
    console.log(e);
    throw 'Something went wrong. Try again please';
  }

  if (!geocodings.length) {
    throw 'nothing found by this locaiton name, try another one';
  }

  return geocodings;
};

const addLocation = async (conversation: BotConversation, ctx: BotContext) => {
  await ctx.reply('please, send geolocation or location name');

  let geocodings: Geocoding[];

  while (true) {
    ctx = await conversation.waitFor('message', async (ctx) => {
      await ctx.reply('it is not a message :(');
    });

    if (ctx.hasCommand('exit')) {
      await ctx.reply('ok, exited');
      return;
    }

    if (!ctx.message) {
      console.log(
        `log: ctx.message is undefined (not received)`,
      );
      await ctx.reply('Something went wrong. Try again please');
      continue;
    }

    const location: string | Location | undefined = ctx.message.text || ctx.message.location;
    if (location) {
      try {
        geocodings = await fetchGeocodings(location);
      } catch (e) {
        await ctx.reply(e);
        continue;
      }
      break;
    }

    await ctx.reply('geolocation or location name are exptected, try again');
  }

  ctx.session.suggestedLocations = [];
  geocodings.map(async (geocoding) => {
    const id = crypto.randomUUID();
    const name = `${geocoding.name}, ${
      geocoding.state ? `${geocoding.state}, ${geocoding.country}` : geocoding.country
    }`;
    const messageId = (await ctx.reply(
      name,
      { reply_markup: createSuggestedLocationReplyMarkup(id) },
    )).message_id;

    ctx.session.suggestedLocations.push({
      id,
      name,
      messageId,
      lat: geocoding.lat,
      lon: geocoding.lon,
    });
  });
};

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const addNotifTime = async (conversation: BotConversation, ctx: BotContext) => {
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
    seconds: 0,
  });
  await ctx.reply(`Time '${time}' has been added to notification time list: /notif_times`);
};

composer.use(conversations());
composer.use(createConversation(addLocation));
composer.use(createConversation(addNotifTime));

export { composer as conversationComposer };
