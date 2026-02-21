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

bot.start((ctx) => ctx.reply("Merhaba! Bot çalışıyor 🚀\nBana bir fotoğraf gönder, AI mı değil mi analiz edeyim."));
bot.help((ctx) => ctx.reply("Bana fotoğraf gönder, ELA analizi yapayım."));

// -------------------------------------------------------
// ELA ANALİZ FONKSİYONU
// -------------------------------------------------------
async function elaAnalysis(imageBuffer) {
  const original = await Jimp.read(imageBuffer);

  // JPEG olarak yeniden sıkıştır (ELA mantığı)
  const temp = await original.clone().quality(90);

  // Fark hesaplamak için boş bir clone oluştur
  const diff = await original.clone();

  // Her pikselin farkını hesapla
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

  // Fark ortalamasını çıkart (ELA skoru)
  let total = 0;
  diff.scan(0, 0, diff.bitmap.width, diff.bitmap.height, function (x, y, idx) {
    total += this.bitmap.data[idx] + this.bitmap.data[idx + 1] + this.bitmap.data[idx + 2];
  });

  const avg = total / (diff.bitmap.width * diff.bitmap.height * 3);
  return avg;
}

// -------------------------------------------------------
// FOTOĞRAF ANALİZİ
// -------------------------------------------------------
bot.on("photo", async (ctx) => {
  try {
    await ctx.reply("🔍 Fotoğraf alındı. Analiz ediliyor...");

    const fileId = ctx.message.photo.pop().file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const response = await fetch(fileLink);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const score = await elaAnalysis(imageBuffer);

    let result = "";
    if (score < 5) result = "🌿 Görüntü büyük ihtimalle GERÇEK.";
    else if (score < 15) result = "⚠️ Şüpheli! Hem gerçek hem yapay olabilir.";
    else result = "🤖 Bu görüntü BÜYÜK İHTİMALLE yapay zeka ile üretilmiş.";

    await ctx.reply(
      `📊 *ELA Skoru:* ${score.toFixed(2)}\n\n${result}`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Analiz sırasında hata oluştu.");
  }
});

// -------------------------------------------------------
// BOTU BAŞLAT
// -------------------------------------------------------
bot.launch();
console.log("Telegram bot aktif 🚀");
