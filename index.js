import express from "express";
import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.get("/", (req, res) => res.send("Video AI Detector ✔️"));
app.listen(10000);

const bot = new Telegraf(process.env.BOT_TOKEN);

const HIVE_API_KEY = process.env.HIVE_API_KEY;

bot.start((ctx) =>
  ctx.reply("Merhaba! 🎥 Videonu gönder, AI mı gerçek mi analiz edeyim.")
);

bot.on("video", async (ctx) => {
  try {
    ctx.reply("🔍 Video indiriliyor...");

    const fileId = ctx.message.video.file_id;
    const link = await ctx.telegram.getFileLink(fileId);

    const response = await fetch(link.href);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync("video.mp4", buffer);

    ctx.reply("🧠 AI analizine gönderiliyor...");

    const apiRes = await fetch("https://api.thehive.ai/api/v2/task", {
      method: "POST",
      headers: {
        "api-key": HIVE_API_KEY,
      },
      body: fs.createReadStream("video.mp4"),
    });

    const task = await apiRes.json();
    const taskId = task.task_id;

    ctx.reply("⏳ Analiz devam ediyor (10-15 saniye)...");

    // TASK SONUCUNU ÇEK
    let result = null;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const r2 = await fetch(
        "https://api.thehive.ai/api/v2/task/" + taskId,
        {
          headers: { "api-key": HIVE_API_KEY }
        }
      );

      const data = await r2.json();

      if (data.status === "completed") {
        result = data;
        break;
      }
    }

    if (!result) return ctx.reply("❌ Analiz zaman aşımına uğradı.");

    const score = result.status === "completed"
      ? result.output[0].score
      : 0.5;

    let message = "";

    if (score < 0.3) message = "🌿 Video büyük ihtimalle GERÇEK.";
    else if (score < 0.6)
      message = "⚠️ Şüpheli video. Hem gerçek hem AI olabilir.";
    else message = "🤖 %99 YAPAY ZEKA ile üretilmiş video!";

    ctx.reply(`📊 AI Skoru: ${(score * 100).toFixed(2)}%\n\n${message}`);
  } catch (e) {
    console.log(e);
    ctx.reply("❌ Video analiz edilirken hata oluştu.");
  }
});

bot.launch();
console.log("Bot aktif!");
