const pino = require("pino")
const chalk = require("chalk")
const printMessage = require("./lib/cuki.js")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys")
const handleMessage = require("./case")
const config = require("./config")

global.config = config

async function startBot() {
  const logger = pino({ level: "silent" })
  const authFile = "sessions"

  console.log(chalk.red(`Load AuthFile from ${authFile}`))

  const { state, saveCreds } = await useMultiFileAuthState(authFile)
  const { version, isLatest } = await fetchLatestBaileysVersion()

  console.log(
    chalk.green(`using WA v${version.join(".")}, isLatest: ${isLatest}`)
  )

  const connectionOptions = {
    version,
    logger,
    printQRInTerminal: !config.pairingAuth,
    browser: ["Mac OS", "Safari", "17.0"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger.child({ level: "silent", stream: "store" })
      )
    },
    generateHighQualityLinkPreview: true,
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        message.templateMessage ||
        message.listMessage
      )

      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {}
              },
              ...message
            }
          }
        }
      }

      return message
    }
  }

  const conn = makeWASocket(connectionOptions)

  global.conn = conn
  conn.isInit = false

  conn.ev.on("creds.update", saveCreds)

  if (config.pairingAuth && !conn.authState.creds.registered) {
    const raw = String(config.phoneNumber || "")
    const phoneNumber = raw.replace(/\D/g, "")
    const deviceName = config.deviceName || "HALOCUKI"

    if (!/^\d{10,15}$/.test(phoneNumber)) {
      console.log(
        chalk.bgRedBright(
          `❌ Nomor di config.js tidak valid: "${raw}". Contoh: 6281234567890`
        )
      )
      process.exit(1)
    }

    console.log(
      chalk.blue("⏳ Menunggu 5 detik sebelum mengambil kode pairing...")
    )

    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log(chalk.blue("⏳ Mengambil kode pairing..."))

    let code = await conn.requestPairingCode(phoneNumber, deviceName)
    code = code?.match(/.{1,4}/g)?.join("-") || code

    console.log(
      chalk.black(chalk.bgGreen("📱 Kode Pairing Anda:")),
      chalk.white(code)
    )

    console.log(
      chalk.cyan(
        "Buka WhatsApp > Linked devices > Link a device > Use pairing code."
      )
    )
  }

  conn.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log(chalk.green("✅ Tersambung ke WhatsApp"))
    }

    if (connection === "close") {
      const code =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.statusCode

      const isLoggedOut = code === DisconnectReason.loggedOut

      console.log(chalk.red("❌ Koneksi terputus. Code:"), code)

      if (!isLoggedOut) {
        console.log(chalk.yellow("🔁 Mencoba menyambung ulang..."))
        startBot()
      } else {
        console.log(
          chalk.bgRed(
            "🧨 Logged out. Hapus folder 'sessions' lalu jalankan & pairing ulang."
          )
        )
        process.exit(0)
      }
    }
  })

  conn.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return

    const m = messages[0]
    if (!m?.message) return
    if (m.key.fromMe) return
    if (m.key.remoteJid === "status@broadcast") return

    try {
      await printMessage(m, conn)
      await handleMessage(conn, m)
    } catch (err) {
      console.error("Error di message handler:", err)
    }
  })

  return conn
}

module.exports = { startBot }