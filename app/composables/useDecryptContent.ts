import type { ContentCollectionItem } from '@nuxt/content'
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'

/** 构建期写入 frontmatter 的密文，字段与 scripts/encrypt-content.ts 一致 */
export interface EncryptedPayload {
	salt: string
	iv: string
	tag: string
	data: string
	/** 密文格式版本，缺省按 1 处理 */
	v?: number
	/** 本条密文的 PBKDF2 迭代次数，缺省按 600k 处理 */
	iter?: number
}

export interface DecryptedContent {
	body: ContentCollectionItem['body']
	slots: Record<string, MetaSlotsTree> | null
}

// 与 shared/utils/encryption.ts 保持一致（组合式函数按密文里的 iter 解密）
const PBKDF2_ITERATIONS = 600_000
const LEGACY_PBKDF2_ITERATIONS = 100_000
const MIN_PBKDF2_ITERATIONS = 10_000
const MAX_PBKDF2_ITERATIONS = 2_000_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const TAG_LENGTH = 16

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i)
	return bytes
}

/** Web Crypto 解密，密码错误会抛出可直接展示的错误信息 */
export async function decryptContent(payload: EncryptedPayload, password: string): Promise<DecryptedContent> {
	const salt = base64ToBytes(payload.salt)
	const iv = base64ToBytes(payload.iv)
	const tag = base64ToBytes(payload.tag)
	const data = base64ToBytes(payload.data)

	if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH)
		throw new Error('密文格式损坏')

	// 迭代次数随密文记录；公开密文可能被篡改参数，限制在合理区间防止 DoS
	const iterations = payload.iter ?? PBKDF2_ITERATIONS
	if (!Number.isInteger(iterations) || iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS)
		throw new Error('密文参数异常')

	const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])

	// GCM 的认证标签要拼在密文后面才能解
	const ciphertext = new Uint8Array(data.length + tag.length)
	ciphertext.set(data, 0)
	ciphertext.set(tag, data.length)

	function decryptWith(iterations: number) {
		return crypto.subtle.deriveKey(
			{ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
			material,
			{ name: 'AES-GCM', length: 256 },
			false,
			['decrypt'],
		)
			.then(key => crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext))
	}

	// 旧版密文（v1 且无 iter 字段）按 600k 解密失败时回退 100k 再试一次
	let plain: ArrayBuffer
	try {
		plain = payload.iter == null
			? await decryptWith(PBKDF2_ITERATIONS).catch(() => decryptWith(LEGACY_PBKDF2_ITERATIONS))
			: await decryptWith(iterations)
	}
	catch {
		throw new Error('解密失败：密码错误或内容已损坏')
	}

	const parsed = JSON.parse(new TextDecoder().decode(plain)) as { body?: DecryptedContent['body'], slots?: DecryptedContent['slots'] }
	if (!parsed?.body)
		throw new Error('解密失败：密文内容格式损坏')

	return { body: parsed.body, slots: parsed.slots ?? null }
}

function storageKey(slug: string) {
	return `pw:${slug}`
}

/** 密码只缓存在本会话的 sessionStorage 里，关闭浏览器即失效 */
export function cachePassword(slug: string, password: string) {
	try {
		sessionStorage.setItem(storageKey(slug), password)
	}
	catch {}
}

export function readCachedPassword(slug: string): string | null {
	try {
		return sessionStorage.getItem(storageKey(slug))
	}
	catch {
		return null
	}
}

export function clearCachedPassword(slug: string) {
	try {
		sessionStorage.removeItem(storageKey(slug))
	}
	catch {}
}
