import { Composer } from 'https://deno.land/x/grammy@v1.10.1/composer.ts';
import { processCallbackQuery } from '../helpers.ts';
import { BotContext, Location } from '../types.ts';

const composer = new Composer<BotContext>();

const UUIDRegex = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

composer.callbackQuery(
  new RegExp(`^delete_location#${UUIDRegex.source}$`),
  processCallbackQuery(async (ctx) => {
    const locationId = ctx.callbackQuery.data.split('#')[1];
    ctx.session.locations = ctx.session.locations.filter((location: Location) =>
      location.id !== locationId
    );

    const message = ctx.callbackQuery.message;
    // TODO: edit message text and delete reply markup
    // intead of deleting message
    if (message) await ctx.deleteMessage();
    await ctx.answerCallbackQuery({ text: 'location has been deleted' });
  }),
);

export { composer as callbackQueryComposer };
