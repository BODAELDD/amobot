import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { downloadImage, analyzeImage } from './utils.js';

dotenv.config();

const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.BOT_TOKEN);
bot.setWebHook(`${process.env.VERCEL_URL}/api/bot${process.env.BOT_TOKEN}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Webhook endpoint
app.post(`/api/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'English', callback_data: 'language_en' },
          { text: 'عربي', callback_data: 'language_ar' }
        ],
        [{ text: 'Start Bot', callback_data: 'start_bot' }]
      ]
    }
  };
  bot.sendMessage(chatId, `✨ Welcome to Candle Prediction Bot ✨`, options);
});

// Callback button
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'language_en') {
    bot.sendMessage(chatId, `Send a screenshot of a candlestick chart and get a prediction.`);
  } else if (data === 'language_ar') {
    bot.sendMessage(chatId, `أرسل لقطة شاشة وسوف يعطيك البوت تنبوئات.`);
  } else if (data === 'start_bot') {
    bot.sendMessage(chatId, `Send me a chart screenshot now ✨`);
  }
});

// Handle image message
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  try {
    const imageBuffer = await downloadImage(fileUrl);
    const result = await analyzeImage(imageBuffer);

    if (result) {
      const { prediction, confidence, duration, recommendation, execution_timing } = result;

      const message = `\u{1F52E} <b>Candle Prediction</b>\n
🕐 Time: ${new Date().toLocaleTimeString()}\n🏆 Prediction: <b>${prediction}</b>\n📈 Confidence: ${confidence}%\n⏱ Duration: ${duration}\n📊 Recommendation: ${recommendation}\n💡 Optimal Timing: ${execution_timing}`;

      bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } else {
      bot.sendMessage(chatId, 'Could not analyze the image. Please try again.');
    }
  } catch (error) {
    console.error('Image analysis failed:', error);
    bot.sendMessage(chatId, 'Something went wrong while processing your image.');
  }
});

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Bot server running...'));
