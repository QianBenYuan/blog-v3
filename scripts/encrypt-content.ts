import type { EncryptedContent, EncryptedPayload } from '../shared/utils/encryption'
import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

import process from 'node:process'
import {

	ENCRYPTION_FORMAT_VERSION,
	IV_LENGTH,
	KEY_LENGTH,
	LEGACY_PBKDF2_ITERATIONS,
	PBKDF2_ITERATIONS,
	SALT_LENGTH,
} from '../shared/utils/encryption'

/** 解析后、写入数据库前的文档（afterParse 钩子拿到的形状） */
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
	title?: string
	path?: string
	[key: string]: unknown
}

/** 用密码派生 AES-256 密钥并加密明文，密文记录格式版本与迭代次数 */
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
		v: ENCRYPTION_FORMAT_VERSION,
		iter: PBKDF2_ITERATIONS,
	}
}

/** 与浏览器端算法对称（Node 侧解密用），兼容无 iter 字段的旧密文 */
export function decryptText(payload: EncryptedPayload, password: string): string {
	const attempts = payload.iter == null
		? [PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS]
		: [payload.iter]
	let lastError: unknown
	for (const iterations of attempts) {
		try {
			return decryptTextWithIterations(payload, password, iterations)
		}
		catch (error) {
			lastError = error
		}
	}
	throw lastError ?? new Error('解密失败')
}

function decryptTextWithIterations(payload: EncryptedPayload, password: string, iterations: number): string {
	const key = pbkdf2Sync(password, Buffer.from(payload.salt, 'base64'), iterations, KEY_LENGTH, 'sha256')
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

/** 文档是否已到自动解锁时间 */
export function isUnlockDue(doc: EncryptableDocument, now = Date.now()): boolean {
	if (!doc.unlockAt)
		return false
	return now >= parseUnlockAt(doc.unlockAt)
}

/** 去掉源文件开头的 frontmatter，返回 markdown 正文原文（file.body 已去过时是无操作） */
export function stripFrontmatter(raw: string): string {
	const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
	return m ? raw.slice(m[0].length) : raw
}

function resolvePassword(doc: EncryptableDocument): string {
	if (doc.passwordEnv) {
		const password = process.env[doc.passwordEnv]
		if (!password)
			throw new Error(`[encrypt-content] 环境变量 ${doc.passwordEnv} 未设置，无法加密文章 ${doc.title || doc.path || ''}`)
		return password
	}
	return doc.password ?? ''
}

/** 与 resolvePassword 相同，但环境变量缺失时返回 undefined 而不是中断构建 */
function tryResolvePassword(doc: EncryptableDocument): string | undefined {
	try {
		return resolvePassword(doc) || undefined
	}
	catch {
		return undefined
	}
}

// @keep-sorted
const WEAK_PASSWORDS = new Set([
	'000000',
	'1q2w3e4r',
	'1qaz2wsx',
	'111111',
	'121212',
	'123123',
	'123321',
	'123456',
	'654321',
	'666666',
	'888888',
	'1234567',
	'12345678',
	'123456789',
	'1234567890',
	'aa123456',
	'abc123',
	'abc123456',
	'admin',
	'admin888',
	'iloveyou',
	'letmein',
	'password',
	'password1',
	'qwerty',
	'qwerty123',
	'qwertyuiop',
])

/**
 * 构建时弱密码检查：密文、盐、IV 全部随页面公开，保密性完全取决于密码强度。
 * 默认只警告（CTF 等场景本就需要可猜的密码），设 ENCRYPT_STRICT=1 让构建失败。
 */
export function checkPasswordStrength(password: string, hint: string | undefined, source: string): void {
	const problems: string[] = []
	if (password.length < 8)
		problems.push('长度不足 8 位')
	if (WEAK_PASSWORDS.has(password.toLowerCase()))
		problems.push('命中常见弱密码表')
	const lower = password.toLowerCase()
	const hintLower = hint?.trim().toLowerCase()
	if (hintLower && lower.length >= 4 && hintLower.includes(lower))
		problems.push('密码出现在 passwordHint 里，提示语会直接帮爆破者缩小范围')
	if (hintLower && hintLower.length >= 4 && lower.includes(hintLower))
		problems.push('passwordHint 出现在密码里')

	if (!problems.length)
		return

	const message = `「${source}」的密码较弱（${problems.join('；')}）。密文是公开的，弱密码可被离线爆破，建议改用随机密码串`
	if (process.env.ENCRYPT_STRICT)
		throw new Error(`[encrypt-content] ${message}（ENCRYPT_STRICT=1）`)
	else
		console.warn(`[encrypt-content] 警告：${message}。设 ENCRYPT_STRICT=1 可让构建失败`)
}

/** 占位正文：结构与解析产物一致（minimark 树 + 空目录），body.toc 与 meta.slots 一并藏起 */
function placeholderBody(hint?: string) {
	const value: unknown[][] = [['p', {}, hint ? `本文已加密。提示：${hint}` : '本文已加密。']]

	return {
		type: 'minimark',
		value,
		toc: { title: '', searchDepth: 0, depth: 0, links: [] },
	}
}

/** 所有分支收尾时调用：明文密码与变量名都不进构建产物（事实源是源文件，下次构建重新解析） */
function stripSecretFields(doc: EncryptableDocument): void {
	delete doc.password
	delete doc.passwordEnv
}

/**
 * 在 content:file:afterParse 中调用，返回本次是否真的执行了加密。
 *
 * - 到期自动解锁：unlockAt 已到期时，用密码把密文恢复成公开正文（密码缺失/错误则保持密码门，优雅降级）；
 * - dev 明文预览：本地开发时密文源文件凭环境变量解密直显，无密码时仍走密码门；明文源文件不加密、直接渲染；
 * - 生产加密：把 {body, slots, markdown 原文} 整体加密进 encryptedData，正文替换为占位符。
 * 幂等：已带 encryptedData 的文档跳过。
 */
export function applyContentEncryption(rawDoc: unknown, rawBody = ''): boolean {
	const doc = rawDoc as EncryptableDocument | null
	if (!doc)
		return false

	if (isUnlockDue(doc)) {
		if (doc.encrypted && doc.encryptedData) {
			const password = tryResolvePassword(doc)
			if (password) {
				try {
					restoreDecryptedBody(doc, doc.encryptedData, password)
					console.info(`[encrypt-content] 已到解锁时间（${doc.unlockAt}），文章已自动公开：${doc.title || doc.path || ''}`)
				}
				catch {
					// 密码不对/内容损坏：保持密文（优雅降级，不阻断构建）
				}
			}
		}
		stripSecretFields(doc)
		return false
	}

	const isDev = process.env.NODE_ENV === 'development'
	if (isDev) {
		// 密文源文件：有密码就解密明文直显，无密码保持密码门
		if (doc.encrypted && doc.encryptedData) {
			const password = tryResolvePassword(doc)
			if (password) {
				try {
					restoreDecryptedBody(doc, doc.encryptedData, password)
				}
				catch {
					return false
				}
			}
			return false
		}
		// 明文源文件：dev 不加密（写作体验），但密码字段也不能留在 dev 数据库里
		stripSecretFields(doc)
		return false
	}

	// 幂等：写回过的密文源文件直接跳过
	if (doc.encrypted || doc.encryptedData)
		return false

	const password = tryResolvePassword(doc)
	if (!password) {
		// 没有可用密码（password 字段为空等）：按普通文章处理，但密码字段不得进产物
		stripSecretFields(doc)
		return false
	}

	checkPasswordStrength(password, doc.passwordHint, doc.title || doc.path || '未知文章')

	const payload = JSON.stringify({
		body: doc.body,
		slots: (doc.meta?.slots as Record<string, unknown> | null) ?? null,
		// markdown 原文（frontmatter 之后的部分），供到期解锁时写回明文 .md
		markdown: stripFrontmatter(rawBody),
	} satisfies EncryptedContent)

	doc.encrypted = true
	doc.encryptedFormat = 'ast'
	doc.encryptedData = encryptText(payload, password)
	doc.body = placeholderBody(doc.passwordHint)
	if (doc.meta)
		doc.meta.slots = {}

	stripSecretFields(doc)
	if (doc.password !== undefined)
		throw new Error('[encrypt-content] 明文 password 字段未能从构建产物中移除，请检查 applyContentEncryption')
	return true
}

/** 解密 encryptedData 并把 body / meta.slots 写回文档（调用方自行 try/catch） */
function restoreDecryptedBody(doc: EncryptableDocument, payload: EncryptedPayload, password: string): void {
	const plain = JSON.parse(decryptText(payload, password)) as EncryptedContent
	doc.body = plain.body ?? doc.body
	if (doc.meta)
		doc.meta.slots = plain.slots ?? {}
	delete doc.encrypted
	delete doc.encryptedData
	delete doc.encryptedFormat
}

const MANIFEST_PATH = '.nuxt/encrypted-manifest.json'

interface EncryptedManifest {
	[contentPath: string]: string
}

/**
 * 加密成功后登记一条泄漏自检记录：文章最终路径 → 正文首行明文特征串。
 * scripts/check-build-leak.mjs 构建后据此扫描产物，特征串出现即说明密文被绕过泄漏。
 */
export function recordEncryptedArticle(contentPath: string, rawBody: string): void {
	const firstLine = stripFrontmatter(rawBody)
		.split('\n')
		.map(line => line.trim())
		.find(line => line && !line.startsWith('<!--'))
		?? ''
	const marker = firstLine.replace(/^[#>*`\-\s]+/, '').replace(/\s+/g, ' ').slice(0, 40)

	let manifest: EncryptedManifest = {}
	try {
		manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as EncryptedManifest
	}
	catch {}
	manifest[contentPath] = marker
	mkdirSync('.nuxt', { recursive: true })
	writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, '\t'), 'utf8')
}

/** 文章本次构建未处于加密状态（已解锁/被解密）时清掉旧记录，让清单始终等于本次加密集合 */
export function removeEncryptedArticle(contentPath: string): void {
	try {
		const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as EncryptedManifest
		if (contentPath in manifest) {
			delete manifest[contentPath]
			writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, '\t'), 'utf8')
		}
	}
	catch {}
}

/**
 * 把已加密的文档写回源 .md 文件（ENCRYPT_BACKFILL 模式专用）：
 * frontmatter 去掉 password（明文密码），保留 passwordEnv（只含变量名，供到期自动解锁用），
 * 写入 encrypted/encryptedFormat/encryptedData，正文换成占位。
 */
export function writeBackEncryptedFile(filePath: string, rawDoc: unknown): boolean {
	const doc = rawDoc as EncryptableDocument
	if (!doc?.encrypted || !doc?.encryptedData)
		return false

	const raw = readFileSync(filePath, 'utf8')
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
	if (!m)
		throw new Error(`[encrypt-content] 无法解析 frontmatter：${filePath}`)

	const kept = m[1].split('\n').filter(line => !/^\s*password:/.test(line))
	const { salt, iv, tag, data, v, iter } = doc.encryptedData
	kept.push('encrypted: true')
	kept.push('encryptedFormat: ast')
	kept.push('encryptedData:')
	kept.push(`  salt: "${salt}"`)
	kept.push(`  iv: "${iv}"`)
	kept.push(`  tag: "${tag}"`)
	kept.push(`  data: "${data}"`)
	kept.push(`  v: ${v ?? ENCRYPTION_FORMAT_VERSION}`)
	kept.push(`  iter: ${iter ?? PBKDF2_ITERATIONS}`)

	const hint = doc.passwordHint ? `本文已加密。提示：${doc.passwordHint}` : '本文已加密。'
	writeFileSync(filePath, `---\n${kept.join('\n')}\n---\n\n${hint}\n`, 'utf8')
	console.info(`[encrypt-content] 已写回密文源文件：${basename(filePath)}`)
	return true
}
