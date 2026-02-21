import express from "express";
import { Telegraf } from "telegraf";

const app = express();
app.get("/", (req, res) => res.send("Bot çalışıyor!"));

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply("Merhaba! Bot çalışıyor 🚀"));
bot.on("text", (ctx) => ctx.reply("Mesaj aldım 😊"));

bot.launch();
app.listen(10000, () => console.log("Server UP"));
