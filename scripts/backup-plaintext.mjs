#!/usr/bin/env node
/**
 * 加密文章离线明文备份（R-01：密文写回后源文件只余占位符，口令丢失 = 文章永久丢失）。
 *
 * 扫描 content/** 下所有加密文章，用 passwordEnv 对应的环境变量解密，
 * 把「完整明文 markdown」写到 backups/plaintext-<时间戳>/（保持原相对路径），
 * 并生成 README.txt 记录清单。**只写 backups/，绝不改动 content/**。
 *
 * backups/ 已在 .gitignore，备份请再自行拷贝到仓库之外的安全位置（离线介质），
 * 口令台账（哪个 Secret 对应哪些文章、密码值）也应离线保管，不要进仓库。
 *
 * 用法：
 *   MOECTF_PW=xxx BLOG_DEV_PW=yyy TOOL_PW=zzz node scripts/backup-plaintext.mjs
 *   node scripts/backup-plaintext.mjs --check   # 只验证能否全部解密，不落盘
 */
import { Buffer } from 'node:buffer'
import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'

const DEFAULT_ITERATIONS = 600_000
const LEGACY_ITERATIONS = 100_000
const KEY_LENGTH = 32

const CONTENT_DIR = join(process.cwd(), 'content')
const CHECK_ONLY = process.argv.includes('--check')

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

/** 与 scripts/unlock-posts.mjs 同源的 frontmatter/密文块解析 */
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

function parseEncryptedData(fm) {
	const lines = fm.split('\n')
	const start = lines.findIndex(line => line.startsWith('encryptedData:'))
	if (start === -1)
		return undefined
	const data = {}
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i]
		if (!/^[ \t]/.test(line))
			break
		const kv = line.match(/^[ \t]+(salt|iv|tag|data|v|iter):(.*)\r?$/)
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

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = join(process.cwd(), 'backups', `plaintext-${stamp}`)
const lines = []
let ok = 0
let failed = 0

for (const file of walk(CONTENT_DIR)) {
	const raw = readFileSync(file, 'utf8')
	const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
	if (!fmMatch)
		continue
	const fm = fmMatch[1]
	const encryptedData = parseEncryptedData(fm)
	if (!encryptedData)
		continue

	const passwordEnv = readField(fm, 'passwordEnv')
	const password = passwordEnv ? process.env[passwordEnv] : undefined
	if (!password) {
		console.error(`[backup] ✗ ${relative(process.cwd(), file)}: 环境变量 ${passwordEnv || '（无 passwordEnv）'} 未设置，无法备份`)
		failed++
		continue
	}

	try {
		const plain = JSON.parse(decrypt(encryptedData, password))
		if (typeof plain?.markdown !== 'string')
			throw new Error('密文里没有 markdown 字段')
		const frontmatterOnly = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '---\n<!-- 加密字段由 backup-plaintext 记录，此处从略 -->\n---\n')
		if (!CHECK_ONLY) {
			const target = join(outDir, relative(CONTENT_DIR, file))
			mkdirSync(join(target, '..'), { recursive: true })
			writeFileSync(target, `---\n${fm}\n---\n${plain.markdown.replace(/^\n+/, '\n')}`, 'utf8')
			writeFileSync(`${target}.frontmatter.txt`, frontmatterOnly, 'utf8')
		}
		console.log(`[backup] ✓ ${relative(process.cwd(), file)}（${passwordEnv}，${plain.markdown.length} 字符）`)
		lines.push(`${relative(CONTENT_DIR, file)}\t${passwordEnv}\t${plain.markdown.length} 字符`)
		ok++
	}
	catch (e) {
		console.error(`[backup] ✗ ${relative(process.cwd(), file)}: 解密失败（${e.message}）`)
		failed++
	}
}

console.log(`[backup] done${CHECK_ONLY ? '（--check 校验模式，未落盘）' : ''}: 成功 ${ok} 篇，失败 ${failed} 篇${ok && !CHECK_ONLY ? `\n备份目录：backups/plaintext-${stamp}` : ''}`)

if (ok && !CHECK_ONLY) {
	const readme = [
		`加密文章明文备份 — ${new Date().toISOString()}`,
		'',
		'本目录含全部可解密加密文章的完整明文（markdown），以及 <文件>.frontmatter.txt',
		'（原 frontmatter 快照，密文字段从略）。口令对应关系：',
		'',
		...lines.map(l => `\t${l}`),
		'',
		'提醒：本目录与仓库都只是中转，请把明文与口令台账再复制到离线安全介质；',
		'口令台账本身不要存进任何联网设备/仓库。',
		'',
	].join('\n')
	writeFileSync(join(outDir, 'README.txt'), readme, 'utf8')
}

if (failed > 0)
	process.exit(1)
