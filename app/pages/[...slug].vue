<script setup lang="ts">
import type { DecryptedContent } from '~/composables/useDecryptContent'

const route = useRoute()

const { data: post } = await useAsyncData(
	`content:${route.path}`,
	() => queryCollection('content').path(route.path).first(),
)

const excerpt = computed(() => post.value?.description || '')
const locked = ref(!!post.value?.encrypted && !!post.value?.encryptedData)

/** 解密成功后把正文写回文章数据，目录/组件槽位随之恢复。
 * 必须整体替换 post.value：asyncData 状态是浅响应式，嵌套赋值不会触发 toc 等依赖更新 */
function onUnlock(content: DecryptedContent) {
	const doc = post.value
	if (!doc)
		return
	post.value = { ...doc, body: content.body, meta: { ...doc.meta, slots: content.slots ?? {} } }
	locked.value = false
}

/** 重新上锁：清掉会话缓存的密码，回到密码门（缓存键用 post.path，与写入端一致） */
function relock() {
	clearCachedPassword(post.value?.path ?? route.path)
	locked.value = true
}

const asideWidgetNames = computed<WidgetName[]>(() => {
	if (!post.value)
		return ['blog-log']
	return (post.value.meta?.aside as WidgetName[] | undefined) ?? ['toc']
})
const { widgets } = useWidgets(asideWidgetNames)

if (post.value) {
	useSeoMeta({
		title: post.value.title,
		ogType: 'article',
		ogImage: post.value.image,
		description: post.value.description,
	})
}
else {
	const event = useRequestEvent()
	event && setResponseStatus(event, 404)
	route.meta.title = '404'
}
</script>

<template>
<template #aside>
	<!-- 更换页面时相同 key 的组件不会更新 -->
	<component :is="widget.comp" v-for="widget in widgets" :key="widget.name" />
</template>

<template v-if="post">
	<PostHeader v-bind="post" />
	<PostExcerpt v-if="excerpt" :excerpt />
	<!-- 加密文章先出密码门，解锁后把正文写回 post，再走正常渲染 -->
	<PostEncrypted
		v-if="locked && post.encryptedData"
		class="article"
		:class="getPostTypeClassName(post?.type, { prefix: 'md' })"
		:payload="post.encryptedData"
		:slug="post.path"
		:hint="post.passwordHint"
		:note="post.passwordNote"
		@unlock="onUnlock"
	/>
	<!-- 使用 float-in 动画会导致搜索跳转不准确 -->
	<ContentRenderer
		v-else
		class="article"
		:class="getPostTypeClassName(post?.type, { prefix: 'md' })"
		:value="post"
		tag="article"
	/>

	<p v-if="post.encryptedData && !locked" class="article-relock">
		<button type="button" @click="relock">
			<Icon name="tabler:lock" />
			重新加密
		</button>
	</p>

	<PostFooter v-bind="post" />
	<PostSurround />
	<PostComment />
</template>

<ZError
	v-else
	icon="line-md:document-delete-twotone"
	title="内容为空或页面不存在"
/>
</template>

<style lang="scss" scoped>
.article-relock {
	text-align: center;

	button {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.3em 0.9em;
		border: 1px solid var(--c-bg-soft);
		border-radius: 999px;
		background-color: transparent;
		font: inherit;
		font-size: 0.85em;
		color: var(--c-text-2);
		transition: color 0.2s, border-color 0.2s;
		cursor: pointer;

		&:hover {
			border-color: var(--c-primary);
			color: var(--c-primary);
		}
	}
}
</style>
