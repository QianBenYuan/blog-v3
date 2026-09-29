import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

/** 与浏览器端 app/composables/useDecryptContent.ts 保持一致 */
export const PBKDF2_ITERATIONS = 100_000
export const SALT_LENGTH = 16
export const IV_LENGTH = 12
export const TAG_LENGTH = 16
export const KEY_LENGTH = 32

export interface EncryptedPayload {
	salt: string
	iv: string
	tag: string
	data: string
}

/** 与浏览器端 app/composables/useDecryptContent.ts 的算法对称（Node 侧解密用） */
export function decryptText(payload: EncryptedPayload, password: string): string {
	const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
	decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
	return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8')
}

/**
 * 解析 unlockAt 为时间戳。
 * 不写时区时按北京时间（UTC+8）解析——博客面向中文读者，约定俗成。
 */
export function parseUnlockAt(value: string): number {
	const t = value.trim().replace(' ', 'T')
	const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(t) ? t : `${t}+08:00`
	const time = Date.parse(withZone)
	if (Number.isNaN(time))
		throw new Error(`[encrypt-content] unlockAt 格式无法解析：${value}（示例：2027-10-07 00:00:00）`)
	return time
}

/**
 * 文档是否已到自动解锁时间。
 * @returns true 已到期 / false 未到期或未设置
 */
export function isUnlockDue(doc: EncryptableDocument, now = Date.now()): boolean {
	if (!doc.unlockAt)
		return false
	return now >= parseUnlockAt(doc.unlockAt)
}

/** 解析后、写入数据库前的文档 */
export interface EncryptableDocument {
	password?: string
	passwordEnv?: string
	passwordHint?: string
	unlockAt?: string
	encrypted?: boolean
	encryptedFormat?: 'ast'
	encryptedData?: EncryptedPayload
	body?: unknown
	meta?: Record<string, unknown>
	[key: string]: unknown
}

export function encryptText(plain: string, password: string): EncryptedPayload {
	const salt = randomBytes(SALT_LENGTH)
	const iv = randomBytes(IV_LENGTH)
	const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
	const cipher = createCipheriv('aes-256-gcm', key, iv)
	const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])

	return {
		salt: salt.toString('base64'),
		iv: iv.toString('base64'),
		tag: cipher.getAuthTag().toString('base64'),
		data: data.toString('base64'),
	}
}

/** 占位正文：结构与解析产物一致（minimark 树 + 空目录） */
function placeholderBody(hint?: string) {
	const value: unknown[][] = [['p', {}, hint ? `本文已加密。提示：${hint}` : '本文已加密。']]

	return {
		type: 'minimark',
		value,
		toc: { title: '', searchDepth: 0, depth: 0, links: [] },
	}
}

/** 去掉源文件开头的 frontmatter，返回 markdown 正文原文 */
function stripFrontmatter(raw: string): string {
	const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
	return m ? raw.slice(m[0].length) : raw
}

function resolvePassword(doc: EncryptableDocument): string | undefined {
	if (doc.passwordEnv) {
		const password = process.env[doc.passwordEnv]
		if (!password)
			throw new Error(`[encrypt-content] 环境变量 ${doc.passwordEnv} 未设置，无法加密文章`)
		return password
	}
	return doc.password
}

/**
 * 在 content:file:afterParse 中调用：
 * 把正文（含 meta.slots 中从正文抽出的内容）加密进 frontmatter，替换为占位正文。
 * 幂等：已带 encryptedData 的文档直接跳过。
 * 自动解锁：文档带 unlockAt 且已到期时——
 *   源文件密文版（encryptedData 已在 frontmatter）：用 passwordEnv 对应环境变量解密恢复正文；
 *   源文件明文版：直接不再加密，构建产物即公开。
 * @param rawDoc 解析后、写入数据库前的文档
 * @param rawBody 源文件原始内容（含 frontmatter），用于把 markdown 原文一并加密，
 *                供到期后「源文件密文版」自动解锁写回明文 .md 用（scripts/unlock-posts.mjs）。
 * @returns 本次是否真的执行了加密（false 表示跳过或已解锁）
 */
export function applyContentEncryption(rawDoc: unknown, rawBody?: string): boolean {
	const doc = rawDoc as EncryptableDocument
	if (!doc)
		return false

	if (isUnlockDue(doc)) {
		// 已公开的文章不能把密码带进构建产物
		delete doc.password
		if (doc.encrypted && doc.encryptedData) {
			let password: string | undefined
			try {
				password = resolvePassword(doc)
			}
			catch {
				// 环境变量缺失：保持密文，页面继续走密码门（优雅降级，不阻断构建）
			}
			if (password) {
				try {
					const plain = JSON.parse(decryptText(doc.encryptedData, password)) as { body?: unknown, slots?: unknown }
					doc.body = plain.body ?? doc.body
					if (doc.meta)
						doc.meta.slots = plain.slots ?? {}
					delete doc.encrypted
					delete doc.encryptedData
					delete doc.encryptedFormat
				}
				catch {
					// 密码不对/内容损坏：保持密文，页面继续走密码门（优雅降级，不阻断构建）
				}
			}
		}
		return false
	}

	if (doc.encrypted || doc.encryptedData)
		return false

	const password = resolvePassword(doc)
	if (!password)
		return false

	const payload = JSON.stringify({
		body: doc.body,
		slots: doc.meta?.slots ?? null,
		// markdown 原文（frontmatter 之后的部分），供到期解锁时写回明文 .md
		markdown: stripFrontmatter(rawBody ?? ''),
	})

	doc.encrypted = true
	doc.encryptedFormat = 'ast'
	doc.encryptedData = encryptText(payload, password)
	doc.body = placeholderBody(doc.passwordHint)
	if (doc.meta)
		doc.meta.slots = {}

	delete doc.password
	delete doc.passwordEnv
	return true
}

/**
 * 把已加密的文档写回源 .md 文件：
 * frontmatter 去掉 password（明文密码），保留 passwordEnv（只含变量名，供到期自动解锁用），
 * 写入 encrypted/encryptedFormat/encryptedData，正文换成占位。
 * 只用于「源文件加密」流程（ENCRYPT_BACKFILL），保证推上公开仓库的 .md 不含明文和密码。
 * @returns 是否真的写了文件
 */
export function writeBackEncryptedFile(filePath: string, doc: EncryptableDocument): boolean {
	if (!doc?.encrypted || !doc?.encryptedData)
		return false

	const raw = readFileSync(filePath, 'utf8')
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
	if (!m)
		throw new Error(`[encrypt-content] 无法解析 frontmatter：${filePath}`)

	const kept = m[1].split('\n').filter(line => !/^\s*password:/.test(line))
	const { salt, iv, tag, data } = doc.encryptedData
	kept.push('encrypted: true')
	kept.push('encryptedFormat: ast')
	kept.push('encryptedData:')
	kept.push(`  salt: "${salt}"`)
	kept.push(`  iv: "${iv}"`)
	kept.push(`  tag: "${tag}"`)
	kept.push(`  data: "${data}"`)

	const hint = doc.passwordHint ? `本文已加密。提示：${doc.passwordHint}` : '本文已加密。'
	writeFileSync(filePath, `---\n${kept.join('\n')}\n---\n\n${hint}\n`, 'utf8')
	return true
}
