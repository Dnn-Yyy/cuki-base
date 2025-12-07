const { WAMessageStubType } = require("@whiskeysockets/baileys")
const PhoneNumber = require("awesome-phonenumber")
const chalk = require("chalk")
const { watchFile } = require("fs")

module.exports = async function printMessage(m, conn = { user: {} }) {
  try {
    if (!m) return

    const senderJid =
      m.sender || m.key?.participant || m.key?.remoteJid || ""

    const chatJid = m.chat || m.key?.remoteJid || ""
    if (!senderJid || !chatJid) return

    const senderNum = senderJid.replace(/[^0-9]/g, "")
    const senderIntl = senderNum
      ? PhoneNumber("+" + senderNum).getNumber("international")
      : "UNKNOWN"

    let senderName = ""
    if (conn.getName) {
      try {
        senderName = await conn.getName(senderJid)
      } catch {}
    }

    let chatName = ""
    if (conn.getName) {
      try {
        chatName = await conn.getName(chatJid)
      } catch {}
    }

    const meJid = conn.user?.id || conn.user?.jid || ""
    const meNum = meJid.replace(/[^0-9]/g, "")
    const meIntl = meNum
      ? PhoneNumber("+" + meNum).getNumber("international")
      : "BOT"

    const meName = conn.user?.name || "Cuki-Bot"

    const tsRaw =
      m.messageTimestamp ||
      m.msg?.messageTimestamp ||
      m.msg?.timestamp ||
      Date.now() / 1000

    const timestamp = new Date(
      typeof tsRaw === "object" ? tsRaw.low * 1000 : tsRaw * 1000
    )

    const tsString = timestamp.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta"
    })

    const mtypeRaw =
      m.mtype ||
      (m.message ? Object.keys(m.message)[0] : "") ||
      ""

    const mtype = mtypeRaw
      .replace(/message$/i, "")
      .replace("audio", m.msg?.ptt ? "PTT" : "audio")
      .replace(/^./, (v) => v.toUpperCase())

    let filesize =
      (m.msg
        ? m.msg.fileLength?.low ||
          m.msg.fileLength ||
          (m.msg.vcard && m.msg.vcard.length) ||
          (m.msg.axolotlSenderKeyDistributionMessage &&
            m.msg.axolotlSenderKeyDistributionMessage.length) ||
          (m.text && m.text.length) ||
          0
        : m.text?.length || 0) || 0

    let sizeHuman = "0 B"
    if (filesize > 0) {
      const unitIndex = Math.floor(Math.log(filesize) / Math.log(1000))
      const units = ["B", "KB", "MB", "GB", "TB"]
      const size = (filesize / 1000 ** unitIndex).toFixed(1)
      sizeHuman = `${size} ${units[unitIndex] || ""}`
    }

    const stub = m.messageStubType
      ? WAMessageStubType[m.messageStubType]
      : ""

    const userDb = global.db?.data?.users?.[senderJid]

    console.log(
      `
${chalk.redBright("🤖 %s")} ${chalk.black(chalk.bgYellow("⏱ %s"))} ${chalk.black(
        chalk.bgGreen("%s")
      )} ${chalk.magenta("%s [%s]")}

${chalk.green("👤 %s")} ${chalk.yellow("%s%s")} ${chalk.blueBright("➡️")} ${chalk.green(
        "%s"
      )} ${chalk.black(chalk.bgYellow("%s"))}
    `.trim(),

      `${meIntl} ~${meName}`,
      tsString,
      stub || "-",
      filesize,
      sizeHuman,

      `${senderIntl}${senderName ? " ~" + senderName : ""}`,
      userDb
        ? `|exp:${userDb.exp}|chat:${userDb.chat}|cmd:${userDb.command}|`
        : "",
      `${chatJid}${chatName ? " ~" + chatName : ""}`,
      mtype || "-"
    )

    const isCommand = m.isCommand || false

    const text =
      m.text ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ""

    if (typeof text === "string" && text && isCommand) {
      console.log(chalk.yellow("⚡ CMD:"), chalk.cyan(text.replace(/\u200e+/g, "")))
    }

    if (m.messageStubParameters) {
      const stubList = await Promise.all(
        m.messageStubParameters.map(async (jid) => {
          jid = conn.decodeJid ? conn.decodeJid(jid) : jid
          const num = jid.replace(/[^0-9]/g, "")

          let name = ""
          if (conn.getName) {
            try {
              name = await conn.getName(jid)
            } catch {}
          }

          return chalk.gray(
            PhoneNumber("+" + num).getNumber("international") +
              (name ? " ~" + name : "")
          )
        })
      )
      console.log("🛈", stubList.join(", "))
    }

    if (/document/i.test(mtypeRaw))
      console.log(`📄 ${m.msg?.fileName || m.msg?.displayName || "Document"}`)

    else if (/ContactsArray/i.test(mtypeRaw))
      console.log(`👨‍👩‍👧‍👦 Kontak`)

    else if (/contact/i.test(mtypeRaw))
      console.log(`👤 ${m.msg?.displayName || "Contact"}`)

    else if (/audio/i.test(mtypeRaw)) {
      const duration = m.msg?.seconds || 0
      console.log(
        `${m.msg?.ptt ? "🎤 (PTT " : "🎵 ("}AUDIO) ${Math.floor(duration / 60)
          .toString()
          .padStart(2, 0)}:${(duration % 60).toString().padStart(2, 0)}`
      )
    }

    console.log()
  } catch (e) {
    console.error("Error di lib/cuki.js:", e)
  }
}

watchFile(__filename, () => {
  console.log(chalk.redBright("♻️  Update 'lib/print.js' terdeteksi"))
})
