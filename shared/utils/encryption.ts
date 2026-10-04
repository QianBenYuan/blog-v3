/**
 * 文章加密的共享参数与类型——单一事实源。
 *
 * 被三处引用，改任何参数都从这里改，避免两端漂移：
 * - 构建侧：scripts/encrypt-content.ts（Node crypto）
 * - 构建钩子：nuxt.config.ts
 * - 浏览器侧：app/composables/useDecryptContent.ts（Web Crypto）
 */

/** 密文格式版本。加密内容结构变化时递增，解密端按版本兼容 */
export const ENCRYPTION_FORMAT_VERSION = 1

/**
 * 新密文的 PBKDF2 迭代次数（PBKDF2-HMAC-SHA256）。
 * OWASP 2023 推荐值 600k；实际迭代数随每条密文记录在 `EncryptedPayload.iter` 里，
 * 调整此值不会影响旧密文的解密。
 */
export const PBKDF2_ITERATIONS = 600_000

/**
 * 旧版密文（v1 且无 iter 字段，早期实现用 100k）的回退迭代次数。
 * 仅当密文没记录 iter 且按 PBKDF2_ITERATIONS 解密失败时尝试。
 */
export const LEGACY_PBKDF2_ITERATIONS = 100_000

/** 浏览器端允许的迭代次数上下限：密文是公开的，防止恶意密文把迭代调到天文数字拖死页面 */
export const MIN_PBKDF2_ITERATIONS = 10_000
export const MAX_PBKDF2_ITERATIONS = 2_000_000

export const SALT_LENGTH = 16
export const IV_LENGTH = 12
export const TAG_LENGTH = 16
/** AES-256 密钥长度（字节） */
export const KEY_LENGTH = 32

/** AES-256-GCM 密文，四个字段均为 Base64 */
export interface EncryptedPayload {
	salt: string
	iv: string
	tag: string
	data: string
	/** 密文格式版本，缺省按 1 处理 */
	v?: number
	/** 本条密文的 PBKDF2 迭代次数，缺省按 PBKDF2_ITERATIONS 处理 */
	iter?: number
}

/** 密文的明文部分（解密后 JSON.parse 得到） */
export interface EncryptedContent {
	/** 解析好的 MDC AST（minimark 树，含 body.toc） */
	body: unknown
	/** 正文里抽出的组件槽位（meta.slots） */
	slots: Record<string, unknown> | null
	/** markdown 原文（frontmatter 之后的部分），供到期解锁时写回明文 .md */
	markdown: string
}
