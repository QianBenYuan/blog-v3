<script setup lang="ts">
import { UtilLink } from '#components'

interface PostBrief { path: string, title?: string, updated?: string, date?: string }

/** 最近更新的文章（有 updated 用 updated，否则按发布日期） */
const { data: posts } = await useAsyncData('widget:post-updates', () =>
	queryCollection('content')
		.where('stem', 'LIKE', 'posts/%')
		.select('path', 'title', 'updated', 'date')
		.all() as Promise<PostBrief[]>)

const items = computed(() => (posts.value ?? [])
	.slice()
	.sort((a, b) => Date.parse(b.updated || b.date || '0') - Date.parse(a.updated || a.date || '0'))
	.slice(0, 8)
	.map(post => ({
		label: post.updated || post.date || '',
		value: () => h(UtilLink, { to: post.path }, () => post.title ?? post.path),
	})))
</script>

<template>
<BlogWidget card title="文章更新">
	<ZDlGroup size="large" :items="items" />
</BlogWidget>
</template>
