/*
JANGAN HAPUS WM INI
creator : cuki digital

===== TQ TO =====
—cuki digital
—cuki-bailx
—
*/
const { watchFile, unwatchFile } = require("fs")
const { cuki } = require("./lib/cuki.js")
const chalk = require("chalk")

const prefixRegex = /^[°zZ#$@+,.?=''():√%!¢£¥€π¤ΠΦ&><`™©®Δ^βα¦|/\\©^]/

function getBody(m) {
  const msg = m.message || {}
  if (msg.conversation) return msg.conversation
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  if (msg.imageMessage?.caption) return msg.imageMessage.caption
  if (msg.videoMessage?.caption) return msg.videoMessage.caption
  return ""
}

function formatRuntime(seconds) {
  const pad = (n) => n.toString().padStart(2, "0")
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

async function handleSwitchCommand(sock, m) {
  try {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    m.chat = from
    let body = getBody(m)
    if (!body) return
    body = body.trim()

    const usedPrefix = prefixRegex.test(body.charAt(0))
      ? body.charAt(0)
      : "."

    if (!prefixRegex.test(body.charAt(0))) return

    const withoutPrefix = body.slice(usedPrefix.length).trim()
    const [cmd, ...rest] = withoutPrefix.split(/\s+/)

    const command = (cmd || "").toLowerCase()
    const args = rest
    const text = args.join(" ")

    const reply = (txt) =>
      sock.sendMessage(
        from,
        { text: txt, mentions: [sender] },
        { quoted: m }
      )

    switch (command) {
      case "ping": {
        await reply("pong")
        break
      }

      case "runtime": {
        const rt = formatRuntime(process.uptime())
        await reply(`⏱ Runtime: *${rt}*`)
        break
      }

      case "menupiw": {
        const uname = sender.split("@")[0]
        const teks = `Halo *@${uname}* 👋🏻

Ini adalah menu dari vyzen.js

▢ ${usedPrefix}runtime
▢ ${usedPrefix}ping`
        await reply(teks)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error("Error di dalam case.js:", err)
  }
}

module.exports = handleSwitchCommand

let file = __filename
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright(`Update '${file}'`))
  if (global.reloadHandler) {
    global.reloadHandler().catch((e) =>
      console.error("reloadHandler error:", e)
    )
  }
})
