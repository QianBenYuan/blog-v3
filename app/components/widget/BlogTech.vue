<script setup lang="ts">
import { merge } from 'es-toolkit/object'
import { packageManager, version } from '~~/package.json'
import pnpmWorkspace from '~~/pnpm-workspace.yaml'
import { Icon } from '#components'

const appConfig = useAppConfig()
const { public: { arch, ci, nodeVersion, platform } } = useRuntimeConfig()

const ciPlatform = computed(() => {
	const iconName = ciIcons[ci]
	if (!iconName)
		return ''

	const iconNode = iconName.startsWith('http')
		? h('img', { src: iconName, alt: '' })
		: h(Icon, { name: iconName })

	return h('span', {}, [iconNode, ` ${ci.split(' ')[0]}`])
})

// @ts-expect-error pnpm-workspace.yaml 无类型定义
const packages = merge(...Object.values(pnpmWorkspace.catalogs))
const [pm, pmVersion] = packageManager.split('@') as [string, string]

const service = computed(() => ([
	...ci ? [{ label: '构建平台', value: ciPlatform }] : [],
	{ label: '图片存储', value: () => [h(Icon, { name: 'devicon:cloudflare' }), ' R2'] },
	{ label: '软件协议', value: 'MIT' },
	{ label: '文章许可', value: appConfig.copyright.abbr },
	{ label: '规范域名', value: getDomain(appConfig.url) },
]))

const techstack = computed(() => ([
	{ label: 'Blog', value: version },
	{ label: 'Vue', value: packages.vue },
	{ label: 'Nuxt', value: packages.nuxt },
	{ label: 'Content', value: packages['@nuxt/content'] },
	{ label: 'Node', value: nodeVersion },
	{ label: pm, value: pmVersion },
	{ label: 'OS', value: platform },
	{ label: 'Arch', value: arch },
]))

const expand = ref(false)
</script>

<template>
<BlogWidget card grayscale title="技术信息">
	<ZDlGroup class="service-dl" size="large" :items="service" />
	<ZExpand v-model="expand" in-place name="构建信息">
		<ZDlGroup size="small" :items="techstack" />
	</ZExpand>
</BlogWidget>
</template>

<style lang="scss" scoped>
.z-expand {
	margin-top: 0.2em;
}

.dl-group :deep(img) {
	height: 1.2em;
	vertical-align: sub;
}

/* 每项一行：label 左、value 右两端对齐，替代默认的上下堆叠 */
.service-dl :deep(div) {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: 0.8em;

	> dt {
		flex-shrink: 0;
	}
}
</style>
