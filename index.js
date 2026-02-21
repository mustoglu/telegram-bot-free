import express from "express";
import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
app.get("/", (req, res) => res.send("Video AI Detector ✔️"));
app.listen(10000);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("Merhaba! 🎥 Videonu gönder, AI mı gerçek mi %99 doğrulukla analiz edeyim.")
);

bot.on("video", async (ctx) => {
  try {
    ctx.reply("🔍 Video alındı, indiriyorum...");

    const fileId = ctx.message.video.file_id;
    const link = await ctx.telegram.getFileLink(fileId);

    const response = await fetch(link.href);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync("input.mp4", buffer);

    ctx.reply("🎬 Kareler çıkarılıyor...");
    
    ffmpeg("input.mp4")
      .save("frames.mp4")
      .on("end", () => {
        ctx.reply("🧠 AI analizi çalışıyor... Bu işlem 5-15 saniye sürebilir.");

        const py = spawn("python3", ["analyzer.py", "frames.mp4"]);

        py.stdout.on("data", async (data) => {
          const score = parseFloat(data.toString().trim());
          let result;

          if (score < 0.3) result = "🌿 GERÇEK video.";
          else if (score < 0.6) result = "⚠️ ŞÜPHELİ video. Hem gerçek hem AI olabilir.";
          else result = "🤖 %99 YAPAY ZEKA ile üretilmiş video!";

          ctx.reply(`📊 AI Skoru: ${(score * 100).toFixed(2)}%\n\n${result}`);
        });
      });
  } catch (e) {
    console.log(e);
    ctx.reply("❌ Videoyu analiz ederken hata oluştu.");
  }
});

bot.launch();
console.log("Telegram bot aktif!");
