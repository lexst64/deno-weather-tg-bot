import { Context, SessionFlavor } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import {
  Conversation,
  ConversationFlavor,
} from 'https://deno.land/x/grammy_conversations@v1.0.2/conversation.ts';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Time {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface SessionData {
  locations: Location[];
  notifTimes: Time[];
  timeoutId: number;
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

export type BotConversation = Conversation<BotContext>;
