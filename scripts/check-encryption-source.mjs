#!/usr/bin/env node
/**
 * 加密文章的「源文件」级自检——秒级，不需要构建。
 *
 * 为什么需要它：build-check（产物级 check:encrypted）已改为只在 PR 上跑，
 * 而本仓库习惯直接推 main，靠 Vercel 构建兜底。Vercel 只会在构建时加密内存里的文档，
 * 不会检查「源码是不是本来就该是密文」，所以推送时补这一道最要紧的关：
 *   1. 带 passwordEnv 的文章必须已经是密文形态（有 encryptedData、正文是占位提示）
 *      ——否则明文会直接进公开仓库，也会进 Vercel 的构建输入
 *   2. frontmatter 里不得出现明文 password 字段
 *   3. passwordEnv 必须是 workflow 里已映射的口令变量名
 *      ——否则 encrypt-content 在 CI 里会抛「环境变量未设置」
 *
 * 它不是产物级检查的替代品：产物里的口令变量名/明文特征串泄漏，仍由 PR 上的
 * pnpm check:encrypted 负责。
 *
 * 用法：node scripts/check-encryption-source.mjs [content 目录，默认 content]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const CONTENT_DIR = join(process.cwd(), process.argv[2] ?? 'content')
const WORKFLOW = join(process.cwd(), '.github', 'workflows', 'auto-unlock.yml')
/** 密文源文件的正文只有一行占位提示；超过这个长度基本可以断定正文没写回密文 */
const PLACEHOLDER_MAX_BODY = 300
const FALLBACK_ENV_NAMES = ['MOECTF_PW', 'BLOG_DEV_PW', 'TOOL_PW']

/** 从 auto-unlock.yml 的 env 块里读「已映射的口令变量名」，避免两处硬编码漂移 */
function mappedPasswordEnvNames() {
	if (!existsSync(WORKFLOW))
		return FALLBACK_ENV_NAMES
	const names = [...readFileSync(WORKFLOW, 'utf8').matchAll(/^\s{2,}([A-Z][A-Z0-9_]*):\s*\$\{\{\s*secrets\./gm)]
		.map(m => m[1])
		.filter(n => n !== 'GITHUB_TOKEN')
	return names.length ? [...new Set(names)] : FALLBACK_ENV_NAMES
}

function* walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name)
		if (statSync(p).isDirectory())
			yield* walk(p)
		else if (name.endsWith('.md'))
			yield p
	}
}

/** 切出 frontmatter 与正文；没有 frontmatter 时返回 null */
function splitFrontmatter(text) {
	if (!text.startsWith('---\n') && !text.startsWith('---\r\n'))
		return null
	const norm = text.replace(/\r\n/g, '\n')
	const end = norm.indexOf('\n---\n', 4)
	if (end === -1)
		return null
	return { frontmatter: norm.slice(4, end), body: norm.slice(end + 5) }
}

const allowed = new Set(mappedPasswordEnvNames())
const problems = []
let gated = 0

if (!existsSync(CONTENT_DIR)) {
	console.error(`[check-encryption-source] 找不到内容目录：${CONTENT_DIR}`)
	process.exit(1)
}

for (const file of walk(CONTENT_DIR)) {
	const rel = file.slice(process.cwd().length + 1)
	const parsed = splitFrontmatter(readFileSync(file, 'utf8'))
	if (!parsed)
		continue
	const { frontmatter, body } = parsed

	const envMatch = frontmatter.match(/^passwordEnv:[ \t]*(?:"([^"\n]+)"|([^\s"#]+))[ \t]*$/m)
	const envName = (envMatch?.[1] ?? envMatch?.[2] ?? '').trim() || undefined
	const hasPlainPassword = /^password:/m.test(frontmatter)
	const hasCipher = /^encryptedData:/m.test(frontmatter)
	const markedEncrypted = /^encrypted:\s*true/m.test(frontmatter)

	if (hasPlainPassword)
		problems.push(`${rel}：frontmatter 出现明文 password 字段，应改用 passwordEnv`)

	if (!envName && !hasCipher)
		continue

	gated++

	if (envName && !allowed.has(envName))
		problems.push(`${rel}：passwordEnv "${envName}" 不在 workflow 映射里（可用：${[...allowed].join(' / ')}）`)

	if (!hasCipher)
		problems.push(`${rel}：带 passwordEnv 但没有 encryptedData —— 源文件还是明文，推送即泄漏`)

	if (hasCipher && body.trim().length > PLACEHOLDER_MAX_BODY)
		problems.push(`${rel}：有密文但正文长 ${body.trim().length} 字（预期 ≤ ${PLACEHOLDER_MAX_BODY} 的占位提示）——疑似解锁后忘了重新加密`)

	if (markedEncrypted && !hasCipher)
		problems.push(`${rel}：encrypted: true 但没有 encryptedData，密文丢了`)
}

if (problems.length) {
	console.error(`[check-encryption-source] ✗ 发现 ${problems.length} 个问题：`)
	for (const p of problems)
		console.error(`  - ${p}`)
	process.exit(1)
}

console.log(`[check-encryption-source] ✓ ${gated} 篇加密文章源文件形态正常（口令变量 ${[...allowed].join(' / ')}）`)
