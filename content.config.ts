import type { ReadTimeResults } from 'reading-time'
import { defineCollection } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { z } from 'zod'
import blogConfig from './blog.config'

type ArticleType = keyof typeof blogConfig.article.types
// 文章类型已在 blog.config 中定义，此处使用 any 类型绕过 zod 类型验证
const articleTypes = Object.keys(blogConfig.article.types) as any

export interface ArticleSchema {
	title?: string
	description?: string
	date?: string
	updated?: string
	published?: string
	categories?: string[]
	tags?: string[]
	type?: ArticleType

	image?: string
	recommend?: number
	references?: { title?: string, link?: string }[]
	/** TODO */
	draft?: boolean
	permalink?: string

	/** 密码明文（只存在于源文件，构建时读取后立即删除，不会进入产物） */
	password?: string
	/** 改从环境变量读取密码，仓库里不留明文密码时用这个 */
	passwordEnv?: string
	/** 明文展示给访客的密码提示 */
	passwordHint?: string
	/** 构建时加密后的标记 */
	encrypted?: boolean
	/** 密文格式，ast = 加密的是构建期解析好的正文 */
	encryptedFormat?: 'ast'
	/** AES-256-GCM 密文（salt/iv/tag/data 均为 Base64） */
	encryptedData?: { salt: string, iv: string, tag: string, data: string }

	readingTime?: ReadTimeResults
}

const articleSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	date: z.string().optional(),
	updated: z.string().optional(),
	published: z.string().optional(),
	categories: z.array(z.string()).default([blogConfig.defaultCategory]),
	tags: z.array(z.string()).default([]),
	type: z.enum(articleTypes).optional().default(articleTypes[0]),

	image: z.string().optional(),
	recommend: z.number().optional(),
	references: z.array(z.object({
		title: z.string().optional(),
		link: z.string().optional(),
	})).optional(),
	draft: z.boolean().default(false),
	permalink: z.string().optional(),

	password: z.string().optional(),
	passwordEnv: z.string().optional(),
	passwordHint: z.string().optional(),
	encrypted: z.boolean().default(false),
	encryptedFormat: z.enum(['ast']).optional(),
	encryptedData: z.object({
		salt: z.string(),
		iv: z.string(),
		tag: z.string(),
		data: z.string(),
	}).optional(),

	readingTime: z.object({
		text: z.string(),
		minutes: z.number(),
		time: z.number(),
		words: z.number(),
	}),
}) satisfies z.ZodType<ArticleSchema>

export const collections = {
	content: defineCollection({
		source: '**',
		type: 'page',
		schema: articleSchema.extend({
			sitemap: defineSitemapSchema({
				name: 'content',
				onUrl: (url, entry) => {
					const lastmod = (entry.updated || entry.published || entry.date) as string | undefined
					if (lastmod)
						url.lastmod = new Date(lastmod).toLocaleDateString('sv')
				},
				z,
			}),
		}),
	}),
}
