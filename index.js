import express from "express";
import { Telegraf } from "telegraf";
import fetch from "node-fetch";

const app = express();
app.get("/", (req, res) => res.send("Video AI Detector ✔️"));
app.listen(10000);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("Merhaba! 🎥 Videonu gönder, deepfake olup olmadığını analiz edeyim.")
);

bot.on("video", async (ctx) => {
  try {
    ctx.reply("🔍 Video alındı, analiz başlıyor...");

    const fileId = ctx.message.video.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    ctx.reply("🧠 Deepware analizine gönderiliyor...");

    const apiRes = await fetch("https://api.deepware.ai/video/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: fileLink.href
      })
    });

    const result = await apiRes.json();

    if (!result || !result.result) {
      return ctx.reply("❌ Deepware analiz hatası: " + JSON.stringify(result));
    }

    let message = "";
    if (result.result === "real") {
      message = "🌿 Video GERÇEK görünüyor.";
    } else if (result.result === "fake") {
      message = "🤖 Video %99 YAPAY / DEEPFAKE görünüyor!";
    } else {
      message = "⚠️ Sonuç belirsiz, net çıkmadı.";
    }

    ctx.reply(`📊 Deepware sonucu: ${result.result.toUpperCase()}

${message}`);

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Analiz sırasında hata oluştu.");
  }
});

bot.launch();
console.log("Bot aktif!");