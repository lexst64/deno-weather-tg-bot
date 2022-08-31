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

    await ctx.editMessageText('<i>location deleted</i>', { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery({ text: 'location has been deleted' });
  }),
);

composer.callbackQuery(
  new RegExp(`^select_location#${UUIDRegex.source}$`),
  processCallbackQuery(async (ctx) => {
    const locaitonId = ctx.callbackQuery.data.split('#')[1];
    const suggestedLocation = ctx.session.suggestedLocations.find((location) =>
      location.id === locaitonId
    );

    /**
     * The location isn't found if user again receives
     * new suggested locations after the first attempt
     * and tries to pick the previous attempt suggested location
     */
    if (!suggestedLocation) {
      await ctx.answerCallbackQuery({
        text: `This location can't be selected anymore`,
        show_alert: true,
      });
      return;
    }

    ctx.session.locations.push(suggestedLocation as Location);

    const chat = ctx.chat;
    if (chat) {
      ctx.session.suggestedLocations.forEach(async (location) => {
        if (suggestedLocation !== location) {
          await ctx.api.editMessageText(chat.id, location.messageId, '~');
          return;
        }
        await ctx.editMessageText('<i>location selected</i>', { parse_mode: 'HTML' });
      });
    }

    ctx.session.suggestedLocations = [];

    await ctx.answerCallbackQuery({ text: 'location has been added' });
    await ctx.reply(
      `Location '${suggestedLocation.name}' has been added to your location list. /locations - to see the whole list`,
    );
  }),
);

export { composer as callbackQueryComposer };
