import 'https://deno.land/std@0.152.0/dotenv/load.ts';
import { Bot, Context, session, SessionFlavor } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { InlineKeyboardMarkup, Message } from 'https://deno.land/x/grammy@v1.10.1/platform.deno.ts';
import {
	Conversation,
	ConversationFlavor,
	conversations,
	createConversation,
} from 'https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts';
import { CallbackProcessor, ContextType, processCallbackQuery } from './helpers.ts';
import { Openweathermap, ReverseGeocoding } from './openweather.api.ts';

const BOT_TOKEN = Deno.env.get('BOT_TOKEN');
const OPENWEATHER_API = Deno.env.get('OPENWEATHER_API');
if (BOT_TOKEN === undefined) throw new Error('no bot token');
if (OPENWEATHER_API === undefined) throw new Error('no openweather api');

const openweathermap = new Openweathermap(OPENWEATHER_API, 'metric');

interface Location {
	id: string;
	lat: number;
	lon: number;
}

interface SessionData {
	locations: Location[];
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

const fetchLocationName = async (lat: number, lon: number): Promise<string> => {
	const data: ReverseGeocoding[] = await openweathermap.reverseGeocoding(lat, lon);
	const { name: city, state, country } = data[0];
	return state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
};

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

const createLocationReplyMarkup = (locationId: string): InlineKeyboardMarkup => {
	return {
		inline_keyboard: [
			[
				{ text: 'delete', callback_data: `delete_location#${locationId}` },
			],
		],
	};
};

const bot = new Bot<MyContext>(BOT_TOKEN);

bot.use(session({
	initial: (): SessionData => ({
		locations: [],
	}),
	getSessionKey: (ctx) => ctx.from?.id.toString(),
}));

bot.use(conversations());
bot.use(createConversation(addLocation));

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

bot.command('weather_now', (ctx) => {
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
});

const UUIDRegex = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;

const deleteProcessor: CallbackProcessor = {
	dataRegex: new RegExp(`^delete_location#${UUIDRegex.source}$`),
	execute: async (ctx: ContextType) => {
		const locationId = ctx.callbackQuery.data.split('#')[1];
		ctx.session.locations = ctx.session.locations.filter((location: Location) =>
			location.id !== locationId
		);

		const message: Message | undefined = ctx.callbackQuery.message;
		if (message) await ctx.deleteMessage();
		await ctx.answerCallbackQuery({ text: 'location has been deleted' });
	},
};

bot.on('callback_query:data', processCallbackQuery(deleteProcessor));

bot.catch((err) => {
	console.log('something went wrong');
	console.error(err);
});

bot.start();
