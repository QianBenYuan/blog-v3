<!-- https://vue-tippy.netlify.app/props/ -->
<!-- 如果要点击触发，请使用 trigger="focusin" 并添加 tabindex="0" -->

<template>
<Tooltip
	class="dropdown"
	interactive
	placement="bottom"
	:arrow="false"
	:hide-on-click="false"
	:offset="[0, 0]"
>
	<slot />
	<template #content="{ hide }">
		<slot name="content" :hide />
	</template>
</Tooltip>
</template>

<style lang="scss" scoped>
// https://vue-tippy.netlify.app/props#appendto
// Tooltip 位于组件根部时，interactive tippy 会插入到父组件
:deep() ~ [data-tippy-root] > .tippy-box {
	padding: 0.3em;
	font-size: inherit;

	&[data-placement="top"] {
		--c-fill: var(--c-bg-1);
	}
}

:deep() ~ [data-tippy-root] .tippy-content {
	display: grid;

	button {
		display: flex;
		align-items: center;
		gap: 0.2em;
		padding: 0.3em 0.5em;
		border-radius: 0.3em;
		text-align: start;
		color: var(--c-text-1);
		transition: color 0.1s, background-color 0.2s;
		cursor: pointer;

		// 子分类缩进排在父分类下方
		&.sub {
			margin-inline-start: 1.2em;
		}

		.count {
			margin-inline-start: auto;
			padding-inline-start: 0.8em;
			font-size: 0.85em;
			color: var(--c-text-3);
		}

		&:hover {
			background-color: var(--c-bg-soft);
			color: var(--c-text-1);
		}

		&.active {
			background-color: var(--c-primary-soft);
			color: var(--c-primary);
		}
	}
}
</style>
