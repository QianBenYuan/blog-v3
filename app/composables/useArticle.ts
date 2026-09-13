import type { ContentCollectionItem } from '@nuxt/content'
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'
import type { ArticleOrderType, ArticleProps } from '~/types/article'
import { orderBy } from 'es-toolkit/array'

/** 获取已加载的文章内容/元信息 */
export function useArticle(path?: MaybeRefOrGetter<string | undefined>) {
	const route = useRoute()
	const dataKey = computed(() => `content:${toValue(path) ?? route.path}`)
	const post = computed(() => useNuxtData<ContentCollectionItem | null | undefined>(dataKey.value).data.value)

	return {
		dataKey,
		post,
		toc: computed(() => post.value?.body.toc),
		metaSlots: computed(() => post.value?.meta.slots as Record<string, MetaSlotsTree>),
	}
}

/**
 * 生成文章查询参数，完全包装 useAsyncData 会使 SSR 行为异常，缓存 key 需要暴露
 * @see https://nuxt.com/docs/4.x/api/composables/use-async-data#usage
 * @see https://github.com/nuxt/nuxt/issues/14736
 * @todo 支持分页/分类筛选
 */
export function getArticleIndexOptions(path = 'posts/%') {
	return queryCollection('content')
		.where('stem', 'LIKE', path)
		.select('categories', 'date', 'description', 'image', 'path', 'readingTime', 'recommend', 'tags', 'title', 'type', 'updated')
		.all()
}

/** 分类下拉项：把文章的 categories 数组当成「分类路径」逐层展开 */
export interface CategoryOption {
	value: string
	/** 0 为顶层分类，> 0 为子分类 */
	depth: number
	parent?: string
	posts: number
}

interface UseCategoryOptions {
	bindQuery?: string
}

export function useCategory(list: MaybeRefOrGetter<ArticleProps[]>, options?: UseCategoryOptions) {
	const { bindQuery } = options || {}

	const category = bindQuery
		? useRouteQuery(bindQuery, undefined)
		: ref<string | undefined>()

	const categories = computed<CategoryOption[]>(() => {
		const options: CategoryOption[] = []
		const index = new Map<string, CategoryOption>()

		for (const item of toValue(list)) {
			const path = (item.categories ?? []).filter(Boolean)

			path.forEach((name, depth) => {
				let option = index.get(name)
				if (!option) {
					// 顺序沿用原来的「首次出现」行为
					option = { value: name, depth, parent: path[depth - 1], posts: 0 }
					index.set(name, option)
					options.push(option)
				}
				// 父分类的计数包含其子分类下的文章
				option.posts++
			})
		}

		return options
	})

	// 只要路径里含有该分类就算命中，所以选父分类会连子分类的文章一起带出来
	const listCategorized = computed(
		() => toValue(list).filter(
			item => !category.value || (item.categories ?? []).includes(category.value),
		),
	)

	return {
		category,
		categories,
		listCategorized,
	}
}

interface UseArticleSortOptions {
	bindDirectionQuery?: string
	bindOrderQuery?: string
	initialAscend?: boolean
	initialOrder?: ArticleOrderType
}

export function useArticleSort(list: MaybeRefOrGetter<ArticleProps[]>, options?: UseArticleSortOptions) {
	const appConfig = useAppConfig()
	const {
		bindDirectionQuery,
		bindOrderQuery,
		initialAscend = false,
		initialOrder = appConfig.pagination.sortOrder || 'date',
	} = options || {}

	const sortOrder = bindOrderQuery
		? useRouteQuery(bindOrderQuery, initialOrder)
		: ref<ArticleOrderType>(initialOrder)

	const booleanQueryTransformer = {
		get: (val: string) => val === 'true',
		set: (val: boolean) => val.toString(),
	}

	const isAscending = bindDirectionQuery
		? useRouteQuery(bindDirectionQuery, initialAscend.toString(), { transform: booleanQueryTransformer })
		: ref<boolean>(initialAscend)

	const listSorted = computed(() => orderBy(
		toValue(list),
		[sortOrder.value, 'date'],
		[isAscending.value ? 'asc' : 'desc'],
	))

	return {
		sortOrder,
		isAscending,
		listSorted,
	}
}

interface CategoryMeta {
	icon?: string
	color?: string
	children?: Record<string, CategoryMeta>
}

/** 查分类元数据：先查顶层，再查各分类的子分类；子分类没定义的字段自动继承父级 */
function findCategoryMeta(category?: string): CategoryMeta | undefined {
	if (!category)
		return undefined

	const categories = useAppConfig().article.categories as Record<string, CategoryMeta>
	const root = categories[category]
	if (root)
		return root

	for (const parent of Object.values(categories)) {
		const child = parent?.children?.[category]
		if (child)
			return { ...parent, ...child }
	}

	return undefined
}

export function getCategoryIcon(category?: string) {
	return findCategoryMeta(category)?.icon ?? 'tabler:folder'
}

export function getCategoryColor(category?: string) {
	return findCategoryMeta(category)?.color
}

/** 分类路径拼成展示文案：['比赛', 'moectf'] -> '比赛 · moectf' */
export function formatCategoryPath(categories?: string[]) {
	return (categories ?? []).filter(Boolean).join(' · ')
}

interface GetPostTypeClassNameOptions {
	prefix?: string
}

export function getPostTypeClassName(type = 'tech', options?: GetPostTypeClassNameOptions) {
	const { prefix = 'text' } = options || {}
	return `${prefix}-${type}`
}
