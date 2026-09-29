import { Buffer } from 'node:buffer'
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import process from 'node:process'
import { readFileSync, writeFileSync } from 'node:fs'

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

/** 解析后、写入数据库前的文档 */
export interface EncryptableDocument {
	password?: string
	passwordEnv?: string
	passwordHint?: string
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
 * @returns 本次是否真的执行了加密（false 表示跳过）
 */
export function applyContentEncryption(rawDoc: unknown): boolean {
	const doc = rawDoc as EncryptableDocument
	if (!doc || doc.encrypted || doc.encryptedData)
		return false

	const password = resolvePassword(doc)
	if (!password)
		return false

	const payload = JSON.stringify({ body: doc.body, slots: doc.meta?.slots ?? null })

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
 * frontmatter 去掉 password/passwordEnv，写入 encrypted/encryptedFormat/encryptedData，正文换成占位。
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

	const kept = m[1].split('\n').filter(line => !/^\s*(password|passwordEnv):/.test(line))
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
