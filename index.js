import express from "express";
import { Telegraf } from "telegraf";
import fetch from "node-fetch";

const app = express();
app.get("/", (req, res) => res.send("Video AI Detector ✔️"));
app.listen(10000);

const bot = new Telegraf(process.env.BOT_TOKEN);
const HIVE_API_KEY = process.env.HIVE_API_KEY;

// Hive endpoint (link analiz eden versiyon)
const HIVE_ENDPOINT = "https://api.hivemoderation.com/v2/task";

bot.start((ctx) =>
  ctx.reply("Merhaba! 🎥 Videonu gönder, AI mı gerçek mi analiz edeyim.")
);

bot.on("video", async (ctx) => {
  try {
    if (!HIVE_API_KEY) {
      return ctx.reply("❌ API anahtarı ayarlı değil. Lütfen HIVE_API_KEY ekle.");
    }

    ctx.reply("🔍 Video alındı, analiz başlıyor...");

    // Telegram video URL
    const fileId = ctx.message.video.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    ctx.reply("🧠 Hive AI'ye gönderiliyor...");

    // Hive API: Link üzerinden analiz
    const apiRes = await fetch(HIVE_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": HIVE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: fileLink.href
      }),
    });

    const task = await apiRes.json();

    if (!task.task_id) {
      return ctx.reply("❌ Hive API Task oluşturamadı: " + JSON.stringify(task));
    }

    const taskId = task.task_id;

    ctx.reply("⏳ Analiz devam ediyor (5-15 saniye)...");

    // Sonucu kontrol et
    let result = null;

    for (let i = 0; i < 20; i++) {
      await new Promise((res) => setTimeout(res, 1500));

      const r2 = await fetch(`${HIVE_ENDPOINT}/${taskId}`, {
        headers: { "api-key": HIVE_API_KEY }
      });

      const data = await r2.json();

      if (data.status === "completed") {
        result = data;
        break;
      }
    }

    if (!result) {
      return ctx.reply("❌ Analiz zaman aşımına uğradı.");
    }

    const score = result.output[0].score;

    let message = "";
    if (score < 0.3) message = "🌿 Video büyük ihtimalle GERÇEK.";
    else if (score < 0.6)
      message = "⚠️ ŞÜPHELİ video. Hem gerçek hem AI olabilir.";
    else message = "🤖 %99 YAPAY ZEKA ile üretilmiş video!";

    ctx.reply(`📊 AI Skoru: ${(score * 100).toFixed(2)}%\n\n${message}`);

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Video analiz edilirken hata oluştu.");
  }
});

bot.launch();
console.log("Bot aktif!");
