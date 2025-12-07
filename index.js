console.log("memulai cuki-bot")
const { startBot } = require("./main");

startBot()
  .then(() => console.log("Bot sedang berjalan..."))
  .catch((err) => {
    console.error("Gagal start bot:", err);
    process.exit(1);
  });