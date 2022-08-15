import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "https://deno.land/x/grammy_conversations@v1.0.2/mod.ts";
import { Context } from "https://deno.land/x/grammy/mod.ts"

type LocationContext = Context & ConversationFlavor
type LocationConversation = Conversation<LocationContext>

const location = async (conversation: LocationConversation, ctx: LocationContext) => {
  await ctx.reply('please, send your location')
  const expectedCtx = await conversation.waitFor('message:location', async ctx => {
    await ctx.reply('it is not a location')
  })
  const location = expectedCtx.message.location
  console.log(location.latitude, location.longitude)
}

export default location
