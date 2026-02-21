import express from "express";
import { Telegraf } from "telegraf";
import Jimp from "jimp";

// -------------------------------------------------------
// EXPRESS SERVER (Render.com için zorunlu)
// -------------------------------------------------------
const app = express();
app.get("/", (req, res) => res.send("Bot çalışıyor! ✔️"));
app.listen(10000, () => console.log("Server aktif (port 10000)"));

// -------------------------------------------------------
// TELEGRAM BOT BAŞLANGICI
// -------------------------------------------------------
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply(
    "Merhaba! Bot çalışıyor 🚀\nBana bir fotoğraf veya PNG gönder, AI mı değil mi analiz edeyim."
  )
);

bot.help((ctx) => ctx.reply("Sadece fotoğraf gönder, analiz edeyim!"));

// -------------------------------------------------------
// ELA ANALİZ FONKSİYONU
// -------------------------------------------------------
async function elaAnalysis(imageBuffer) {
  const original = await Jimp.read(imageBuffer);

  // JPEG olarak yeniden sıkıştır
  const temp = await original.clone().quality(90);

  // Fark görüntüsü oluştur
  const diff = await original.clone();

  diff.scan(0, 0, diff.bitmap.width, diff.bitmap.height, function (x, y, idx) {
    const r1 = original.bitmap.data[idx + 0];
    const g1 = original.bitmap.data[idx + 1];
    const b1 = original.bitmap.data[idx + 2];

    const r2 = temp.bitmap.data[idx + 0];
    const g2 = temp.bitmap.data[idx + 1];
    const b2 = temp.bitmap.data[idx + 2];

    this.bitmap.data[idx + 0] = Math.abs(r1 - r2) * 10;
    this.bitmap.data[idx + 1] = Math.abs(g1 - g2) * 10;
    this.bitmap.data[idx + 2] = Math.abs(b1 - b2) * 10;
  });

  // Fark ortalaması
  let total = 0;
  diff.scan(0, 0, diff.bitmap.width, diff.bitmap.height, function (x, y, idx) {
    total +=
      this.bitmap.data[idx] +
      this.bitmap.data[idx + 1] +
      this.bitmap.data[idx + 2];
  });

  const avg = total / (diff.bitmap.width * diff.bitmap.height * 3);
  return avg;
}

// -------------------------------------------------------
// TELEGRAM - PHOTO ANALİZ
// -------------------------------------------------------
bot.on("photo", async (ctx) => {
  try {
    await ctx.reply("🔍 Fotoğraf alındı. Analiz ediliyor...");

    const fileId = ctx.message.photo.pop().file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink);
    const buffer = Buffer.from(await response.arrayBuffer());

    const score = await elaAnalysis(buffer);

    let result = "";
    if (score < 5) result = "🌿 Bu görüntü büyük ihtimalle GERÇEK.";
    else if (score < 15) result = "⚠️ Şüpheli! Hem gerçek hem yapay olabilir.";
    else result = "🤖 Bu görüntü BÜYÜK İHTİMALLE yapay zeka ile üretilmiş.";

    await ctx.reply(
      `📊 *ELA Skoru:* ${score.toFixed(2)}\n\n${result}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Fotoğraf analiz edilirken bir hata oluştu.");
  }
});

// -------------------------------------------------------
// TELEGRAM - DOCUMENT (PNG/JPG) ANALİZ
// -------------------------------------------------------
bot.on("document", async (ctx) => {
  try {
    const file = ctx.message.document;

    // Sadece PNG ve JPG kabul edelim
    if (
      !file.mime_type.includes("png") &&
      !file.mime_type.includes("jpg") &&
      !file.mime_type.includes("jpeg")
    ) {
      return ctx.reply("❌ Bu dosya bir görüntü değil. PNG veya JPG gönder.");
    }

    await ctx.reply("🔍 PNG/JPG dosyası alındı. Analiz ediliyor...");

    const fileLink = await ctx.telegram.getFileLink(file.file_id);
    const response = await fetch(fileLink);
    const buffer = Buffer.from(await response.arrayBuffer());

    const score = await elaAnalysis(buffer);

    let result = "";
    if (score < 5) result = "🌿 Görüntü büyük ihtimalle GERÇEK.";
    else if (score < 15) result = "⚠️ Şüpheli! Hem gerçek hem yapay olabilir.";
    else result = "🤖 Görüntü büyük ihtimalle YAPAY ZEKA.";

    await ctx.reply(
      `📊 *ELA Skoru:* ${score.toFixed(2)}\n\n${result}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Analiz sırasında hata oluştu (document).");
  }
});

// -------------------------------------------------------
// BOTU BAŞLAT
// -------------------------------------------------------
bot.launch();
console.log("Telegram bot aktif 🚀");
