#!/usr/bin/env node
/**
 * 到期自动解锁脚本（供 GitHub Actions 定时运行）：
 * 扫描 content/** 下所有 .md，找出「unlockAt 已到期 且 仍处于加密状态」的文章，
 * 用 passwordEnv 对应的环境变量（仓库 Secret）解密 encryptedData，
 * 把 .md 重写为明文（frontmatter 去掉加密字段 + 恢复 markdown 正文）。
 *
 * 之后由 workflow 把改动提交推送，Vercel 重新构建后文章即公开。
 * 解密失败/缺密码的文章保持原样（下次运行再试，或一直走密码门）。
 *
 * 用法：MOECTF_PW=xxx node scripts/unlock-posts.mjs
 */
import { Buffer } from 'node:buffer'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const CONTENT_DIR = join(process.cwd(), 'content')
const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 32

function parseUnlockAt(value) {
	const t = value.trim().replace(' ', 'T')
	const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(t) ? t : `${t}+08:00`
	const time = Date.parse(withZone)
	return Number.isNaN(time) ? null : time
}

function decrypt(payload, password) {
	const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
	decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
	return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8')
}

function walk(dir) {
	const entries = []
	for (const name of readdirSync(dir)) {
		const p = join(dir, name)
		if (statSync(p).isDirectory())
			entries.push(...walk(p))
		else if (name.endsWith('.md'))
			entries.push(p)
	}
	return entries
}

/** 去掉加密相关顶层字段，保留其余 frontmatter（含 unlockAt/passwordHint） */
function filterFrontmatter(fm) {
	const drop = new Set(['password', 'passwordEnv', 'encrypted', 'encryptedFormat', 'encryptedData'])
	const lines = fm.split('\n')
	const kept = []
	let currentKey = null
	let dropping = false
	for (const line of lines) {
		const keyMatch = line.match(/^([\w-]+):/)
		if (keyMatch && !line.startsWith(' ')) {
			currentKey = keyMatch[1]
			dropping = drop.has(currentKey)
		}
		if (!dropping)
			kept.push(line)
	}
	return kept.join('\n')
}

function parsePayload(fm) {
	const out = {}
	for (const key of ['passwordEnv', 'unlockAt']) {
		const m = fm.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'))
		if (m)
			out[key] = m[1]
	}
	const block = fm.match(/^encryptedData:\n((?: {2}[^\n]*\n?)+)/m)
	if (block) {
		const data = {}
		for (const line of block[1].split('\n')) {
			const m = line.match(/^ {2}(salt|iv|tag|data):\s*["']?([^"'\n]+)["']?/)
			if (m)
				data[m[1]] = m[2]
		}
		out.encryptedData = data
	}
	return out
}

const now = Date.now()
let changed = 0
let skipped = 0

for (const file of walk(CONTENT_DIR)) {
	const raw = readFileSync(file, 'utf8')
	const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
	if (!fmMatch)
		continue
	const fm = fmMatch[1]
	const info = parsePayload(fm)
	if (!info.unlockAt || !info.encryptedData)
		continue
	const time = parseUnlockAt(info.unlockAt)
	if (time === null || now < time)
		continue

	const password = info.passwordEnv ? process.env[info.passwordEnv] : undefined
	if (!password) {
		console.warn(`[unlock-posts] ${file}: 缺环境变量 ${info.passwordEnv}，跳过（下次再试）`)
		skipped++
		continue
	}
	let plain
	try {
		plain = JSON.parse(decrypt(info.encryptedData, password))
	}
	catch (e) {
		console.warn(`[unlock-posts] ${file}: 解密失败，保持密文（${e.message}）`)
		skipped++
		continue
	}
	if (typeof plain?.markdown !== 'string') {
		console.warn(`[unlock-posts] ${file}: 密文里没有 markdown 字段，无法写回明文，跳过`)
		skipped++
		continue
	}

	const newFm = filterFrontmatter(fm)
	const out = `---\n${newFm}\n---\n${plain.markdown.replace(/^\n+/, '\n')}`
	writeFileSync(file, out, 'utf8')
	console.log(`[unlock-posts] 已解锁: ${file}`)
	changed++
}

console.log(`[unlock-posts] done: 解锁 ${changed} 篇，跳过 ${skipped} 篇`)
