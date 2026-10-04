#!/usr/bin/env node
/**
 * 构建产物泄漏自检（配合构建时加密 / ENCRYPT_BACKFILL 使用）：
 * 1. 加密文章的正文明文特征串不得出现在任何产物文件里（含 llms.txt / atom.xml 等边角）
 * 2. 产物 JSON 里不得出现非空的 "password":"..." 键
 * 3. 加密文章的页面 payload 里应带 encrypted:true（密码门确实生效）
 *
 * 前置：构建时加密会把「文章路径 → 正文首行明文特征串」登记到 .nuxt/encrypted-manifest.json。
 * 用法：pnpm generate && pnpm check:encrypted
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const OUTPUT_DIRS = ['.output/public', '.output/server'].map(dir => join(process.cwd(), dir))
const MANIFEST = join(process.cwd(), '.nuxt', 'encrypted-manifest.json')
const SCAN_EXTENSIONS = new Set(['.html', '.json', '.xml', '.txt', '.js', '.mjs'])

if (!existsSync(MANIFEST)) {
	console.log('[check-leak] 没有加密文章（无 .nuxt/encrypted-manifest.json），跳过检查')
	process.exit(0)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const entries = Object.entries(manifest)
console.log(`[check-leak] 检查 ${entries.length} 篇加密文章的构建产物…`)

function* walk(dir) {
	if (!existsSync(dir))
		return
	for (const name of readdirSync(dir)) {
		const p = join(dir, name)
		if (statSync(p).isDirectory())
			yield* walk(p)
		else
			yield p
	}
}

const textFiles = []
for (const dir of OUTPUT_DIRS) {
	for (const path of walk(dir)) {
		const ext = path.slice(path.lastIndexOf('.')).toLowerCase()
		if (SCAN_EXTENSIONS.has(ext))
			textFiles.push({ path, content: readFileSync(path, 'utf8') })
	}
}

const problems = []

// 1. 明文特征串不得泄漏进产物
for (const [contentPath, marker] of entries) {
	if (!marker || marker.length < 5)
		continue
	for (const file of textFiles) {
		if (file.content.includes(marker)) {
			problems.push(`明文特征串泄漏：「${contentPath}」的正文出现在 ${file.path}`)
			break
		}
	}
}

// 2. 产物 JSON 不得出现非空 password 键
for (const file of textFiles) {
	if (!file.path.endsWith('.json'))
		continue
	const m = file.content.match(/"password"\s*:\s*"[^"]+"/)
	if (m)
		problems.push(`疑似明文密码进入产物：${file.path} 匹配到 ${m[0].slice(0, 40)}…`)
}

// 3. 加密文章页面 payload 应为「密文 + 占位正文」形态（Nuxt payload 是 devalue 序列化，
// 布尔值进字符串表，不能按 "encrypted":true 字面量匹配）
for (const [contentPath] of entries) {
	const payloadPath = join(process.cwd(), '.output', 'public', contentPath.replace(/^\/+/, ''), '_payload.json')
	if (!existsSync(payloadPath))
		continue
	const payload = readFileSync(payloadPath, 'utf8')
	if (!payload.includes('"encryptedData"') || !payload.includes('本文已加密'))
		problems.push(`页面 payload 缺少密文或占位正文（密码门未生效？）：${payloadPath}`)
}

if (problems.length) {
	for (const p of problems)
		console.error(`[check-leak] ✗ ${p}`)
	console.error(`[check-leak] 发现 ${problems.length} 处泄漏风险，产物不可部署！`)
	process.exit(1)
}
console.log('[check-leak] ✓ 未发现泄漏')
