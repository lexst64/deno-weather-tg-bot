import { Composer } from 'https://deno.land/x/grammy@v1.10.1/composer.ts';
import {
  conversations,
  createConversation,
} from 'https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts';
import { openweathermap } from '../index.ts';
import { BotContext, BotConversation, Location } from '../types.ts';

const composer = new Composer<BotContext>();

const addLocation = async (conversation: BotConversation, ctx: BotContext) => {
  await ctx.reply('please, send your location');
  ctx = await conversation.waitFor('message:location', async (ctx) => {
    await ctx.reply('it is not a location :(');
  });

  if (!ctx.message || !ctx.message.location) {
    console.log(
      `log: ${!ctx.message ? 'ctx.message' : 'ctx.message.location'} is undefined (not received)`,
    );
    await ctx.reply('Something went wrong. Try again please');
    return;
  }

  const { latitude: lat, longitude: lon } = ctx.message.location;

  const location: Location = {
    id: await conversation.external(() => crypto.randomUUID()),
    name: await conversation.external(() => openweathermap.locationName(lat, lon)),
    lat,
    lon,
  };

  ctx.session.locations.push(location);
  return await ctx.reply(
    `Location '${location.name}' has been added to your location list. /locations - to see the whole list`,
  );
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
  });
  await ctx.reply(`Time '${time}' has been added to notification time list: /notif_times`);
};

composer.use(conversations());
composer.use(createConversation(addLocation));
composer.use(createConversation(addNotifTime));

export { composer as conversationComposer };
