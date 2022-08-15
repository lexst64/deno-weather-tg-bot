import "https://deno.land/std@0.152.0/dotenv/load.ts"
import {
  Bot,
  Context,
  session,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.10.1/mod.ts";
import { Conversation, ConversationFlavor, conversations, createConversation } from "https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts";
import { Openweathermap, ReverseGeocoding } from "./openweather.api.ts";

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')
const OPENWEATHER_API = Deno.env.get('OPENWEATHER_API')
if (BOT_TOKEN === undefined) throw new Error('no bot token')
if (OPENWEATHER_API === undefined) throw new Error('no openweather api')

const openweathermap = new Openweathermap(OPENWEATHER_API, 'metric')

interface SessionData {
  lat: number
  lon: number
}

type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor
type MyConversation = Conversation<MyContext>

const fetchLocationName = async (lat: number, lon: number): Promise<string> => {
  const data: ReverseGeocoding[] = await openweathermap.reverseGeocoding(lat, lon)
  const {name: city, state, country} = data[0] 
  return state
    ? `${city}, ${state}, ${country}`
    : `${city}, ${country}`
}

const location = async (conversation: MyConversation, ctx: MyContext) => {
  await ctx.reply('please, send your location')
  ctx = await conversation.waitFor('message:location', async ctx => {
    await ctx.reply('it is not a location :(')
  })
  const location = ctx.message!.location
  const lat = location!.latitude 
  const lon = location!.longitude
  ctx.session.lat = lat
  ctx.session.lon = lon
  const locationName: string = await fetchLocationName(lat, lon)
  await ctx.reply(`Updated! Now it's set to ${locationName}`)
}

const bot = new Bot<MyContext>(BOT_TOKEN)

bot.use(session({
  initial: (): SessionData => ({lat: 0, lon: 0}),
  getSessionKey: ctx => ctx.from?.id.toString()
}))

bot.use(conversations())
bot.use(createConversation(location))

bot.command('set_location', async ctx => {
  await ctx.conversation.reenter('location')
})

bot.command('get_location', async ctx => {
  const locationName: string = await fetchLocationName(ctx.session.lat, ctx.session.lon)
  await ctx.reply(`The current location is ${locationName}`)
})

bot.command('weather_now', async ctx => {
  const data = await openweathermap.currentWeather(ctx.session.lat, ctx.session.lon)
  await ctx.reply(`
    Weather: ${data.weather[0].main}, ${data.weather[0].description}\n
    Temp: ${data.main.temp}, feels like ${data.main.feels_like}\n
    Wind: ${data.wind.speed}, ${data.wind.deg}
    Cloudiness: ${data.clouds.all}
  `)
})

bot.catch(err => {
  console.log('something went wrong')
  console.error(err)
})

bot.start()
