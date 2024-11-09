import axios from 'axios';
import config from '../config/index.js';
import { handleFulfilled, handleRejected, handleRequest } from './utils/index.js';

// Constants
export const EVENT_TYPE_MESSAGE = 'message';
export const EVENT_TYPE_POSTBACK = 'postback';
export const SOURCE_TYPE_USER = 'user';
export const SOURCE_TYPE_GROUP = 'group';
export const MESSAGE_TYPE_TEXT = 'text';
export const MESSAGE_TYPE_STICKER = 'sticker';
export const MESSAGE_TYPE_AUDIO = 'audio';
export const MESSAGE_TYPE_IMAGE = 'image';
export const MESSAGE_TYPE_TEMPLATE = 'template';
export const TEMPLATE_TYPE_BUTTONS = 'buttons';
export const ACTION_TYPE_MESSAGE = 'message';
export const ACTION_TYPE_POSTBACK = 'postback';
export const QUICK_REPLY_TYPE_ACTION = 'action';

// Helper function to remove markdown while preserving specific list formats
const removeMarkdown = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    // Remove bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`(.*?)`/g, '$1')
    // Remove blockquotes
    .replace(/^\s*>+\s*/gm, '')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Handle list items - convert * to - but preserve - and numbered lists
    .replace(/^\s*\*\s+/gm, '- ')  // Convert * to -
    // Remove links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '')
    // Remove horizontal rules
    .replace(/^[\-=_]{3,}\s*$/gm, '')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

const client = axios.create({
  baseURL: 'https://api.line.me',
  timeout: config.LINE_TIMEOUT,
  headers: {
    'Accept-Encoding': 'gzip, deflate, compress',
  },
});

client.interceptors.request.use((c) => {
  c.headers.Authorization = `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN}`;
  return handleRequest(c);
});

client.interceptors.response.use(handleFulfilled, (err) => {
  if (err.response?.data?.message) {
    err.message = err.response.data.message;
  }
  return handleRejected(err);
});

const reply = ({ replyToken, messages }) => {
  // Process messages to remove markdown if they are text messages
  const processedMessages = messages.map(msg => {
    if (msg.type === MESSAGE_TYPE_TEXT && msg.text) {
      return {
        ...msg,
        text: removeMarkdown(msg.text)
      };
    }
    return msg;
  });

  return client.post('/v2/bot/message/reply', {
    replyToken,
    messages: processedMessages,
  });
};

const fetchGroupSummary = ({ groupId }) =>
  client.get(`/v2/bot/group/${groupId}/summary`);

const fetchProfile = ({ userId }) =>
  client.get(`/v2/bot/profile/${userId}`);

const dataClient = axios.create({
  baseURL: 'https://api-data.line.me',
  timeout: config.LINE_TIMEOUT,
  headers: {
    'Accept-Encoding': 'gzip, deflate, compress',
  },
});

dataClient.interceptors.request.use((c) => {
  c.headers.Authorization = `Bearer ${config.LINE_CHANNEL_ACCESS_TOKEN}`;
  return handleRequest(c);
});

dataClient.interceptors.response.use(handleFulfilled, (err) => {
  if (err.response?.data?.message) {
    err.message = err.response.data.message;
  }
  return handleRejected(err);
});

const fetchContent = ({ messageId }) =>
  dataClient.get(`/v2/bot/message/${messageId}/content`, {
    responseType: 'arraybuffer',
  });

export {
  reply,
  fetchGroupSummary,
  fetchProfile,
  fetchContent,
};
