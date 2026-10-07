#!/usr/bin/env node
/**
 * 加密文章解锁脚本（纯 Node，供 GitHub Actions 定时运行 / 本地手动恢复明文）。
 *
 * 默认模式：扫描 content/** 下所有 .md，找出「unlockAt 已到期 且 仍处于加密状态」的文章，
 *   用 passwordEnv 对应的环境变量（仓库 Secret）解密 encryptedData，
 *   把 .md 重写为明文——frontmatter 去掉 password/passwordEnv/passwordHint/encrypted*，
 *   恢复 markdown 正文。文章从此永久公开。
 *
 * --all 模式（本地编辑用）：把所有加密文章恢复成明文，但保留 passwordEnv/unlockAt/passwordHint，
 *   改完稿重新构建（ENCRYPT_BACKFILL=1 + 环境变量）即可再加密写回，编辑闭环。
 *
 * 解密失败/缺密码的文章保持原样（下次运行再试，或一直走密码门）。
 *
 * 用法：
 *   MOECTF_PW=xxx node scripts/unlock-posts.mjs          # 只解锁已到期文章
 *   node scripts/unlock-posts.mjs --all --pw 123456      # 本地恢复所有加密文章明文（直接传密码，免配 Secret）
 *   MOECTF_PW=xxx node scripts/unlock-posts.mjs --all    # 同上，密码走环境变量
 */
import { Buffer } from 'node:buffer'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

// 与 shared/utils/encryption.ts 保持一致（CI 环境跑不了 TS，这里按密文里的 iter 解密）
const DEFAULT_ITERATIONS = 600_000
const LEGACY_ITERATIONS = 100_000
const KEY_LENGTH = 32

const CONTENT_DIR = join(process.cwd(), 'content')
const RESTORE_ALL = process.argv.includes('--all')
const CLI_PASSWORD = process.argv.includes('--pw')
	? process.argv[process.argv.indexOf('--pw') + 1]
	: undefined

function decrypt(payload, password) {
	const attempts = payload.iter == null
		? [DEFAULT_ITERATIONS, LEGACY_ITERATIONS]
		: [payload.iter]
	let lastError
	for (const iterations of attempts) {
		try {
			const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), iterations, KEY_LENGTH, 'sha256')
			const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
			decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
			return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8')
		}
		catch (e) {
			lastError = e
		}
	}
	throw lastError
}

function parseUnlockAt(value) {
	const t = value.trim().replace(' ', 'T')
	const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(t) ? t : `${t}+08:00`
	const time = Date.parse(withZone)
	return Number.isNaN(time) ? null : time
}

/** 读取单个 frontmatter 字段：容错引号、行尾注释 */
function readField(fm, key) {
	const m = fm.match(new RegExp(`^${key}:[^\\n]*`, 'm'))
	if (!m)
		return undefined
	let v = m[0].slice(key.length + 1).trim()
	v = v.replace(/(^|\s)#.*$/, '')
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\'')))
		v = v.slice(1, -1)
	return v.trim() || undefined
}

/** 读取 encryptedData 块（YAML 缩进风格，兼容 v/iter 字段） */
function parseEncryptedData(fm) {
	const lines = fm.split('\n')
	const start = lines.findIndex(line => line.startsWith('encryptedData:'))
	if (start === -1)
		return undefined
	const data = {}
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i]
		// 离开缩进块即结束
		if (!/^[ \t]/.test(line))
			break
		const kv = line.match(/^[ \t]+(salt|iv|tag|data|v|iter):(.*)$/)
		if (!kv)
			continue
		let value = kv[2].trim().replace(/(^|\s)#.*$/, '')
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
			value = value.slice(1, -1)
		data[kv[1]] = kv[1] === 'v' || kv[1] === 'iter' ? Number.parseInt(value, 10) : value
	}
	if (!data.salt || !data.iv || !data.tag || !data.data)
		return undefined
	return data
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

/**
 * 去掉加密相关顶层字段，保留其余 frontmatter。
 * permanentlyPublic 时连 passwordEnv/passwordHint 一起去掉（文章从此公开）；
 * --all 模式保留它们，重新构建时可再加密。
 */
function filterFrontmatter(fm, permanentlyPublic) {
	const drop = new Set(['password', 'encrypted', 'encryptedFormat', 'encryptedData'])
	if (permanentlyPublic) {
		drop.add('passwordEnv')
		drop.add('passwordHint')
		drop.add('passwordNote')
	}
	const kept = []
	let dropping = false
	for (const line of fm.split('\n')) {
		const keyMatch = line.match(/^([\w-]+):/)
		if (keyMatch && !line.startsWith(' ')) {
			dropping = drop.has(keyMatch[1])
		}
		if (!dropping)
			kept.push(line)
	}
	return kept.join('\n')
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
	const encryptedData = parseEncryptedData(fm)
	if (!encryptedData)
		continue

	if (!RESTORE_ALL) {
		const unlockAt = readField(fm, 'unlockAt')
		if (!unlockAt)
			continue
		const time = parseUnlockAt(unlockAt)
		if (time === null || now < time)
			continue
	}

	const passwordEnv = readField(fm, 'passwordEnv')
	const password = CLI_PASSWORD || (passwordEnv ? process.env[passwordEnv] : undefined)
	if (!password) {
		console.warn(`[unlock-posts] ${file}: 缺密码（--pw 或环境变量 ${passwordEnv || '（源文件无 passwordEnv）'}），跳过`)
		skipped++
		continue
	}

	let plain
	try {
		plain = JSON.parse(decrypt(encryptedData, password))
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

	const newFm = filterFrontmatter(fm, !RESTORE_ALL)
	const out = `---\n${newFm}\n---\n${plain.markdown.replace(/^\n+/, '\n')}`
	writeFileSync(file, out, 'utf8')
	console.log(`[unlock-posts] 已解锁${RESTORE_ALL ? '（保留 passwordEnv 供重新加密）' : ''}: ${file}`)
	changed++
}

console.log(`[unlock-posts] done: 解锁 ${changed} 篇，跳过 ${skipped} 篇`)
