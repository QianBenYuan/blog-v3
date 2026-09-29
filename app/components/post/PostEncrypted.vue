<script setup lang="ts">
import type { DecryptedContent, EncryptedPayload } from '~/composables/useDecryptContent'

const props = defineProps<{
	payload: EncryptedPayload
	slug: string
	hint?: string
}>()

const emit = defineEmits<{ unlock: [content: DecryptedContent] }>()

const password = ref('')
const pending = ref(false)
const error = ref('')
const input = useTemplateRef<HTMLInputElement>('input')

async function unlock(value: string) {
	if (pending.value || !value)
		return

	pending.value = true
	error.value = ''
	try {
		const content = await decryptContent(props.payload, value)
		cachePassword(props.slug, value)
		emit('unlock', content)
	}
	catch (err) {
		error.value = err instanceof Error ? err.message : '解密失败，请检查密码'
	}
	finally {
		pending.value = false
	}
}

function onSubmit() {
	unlock(password.value)
}

onMounted(() => {
	const cached = readCachedPassword(props.slug)
	if (cached)
		unlock(cached)
	else
		input.value?.focus()
})
</script>

<template>
<div class="password-gate">
	<div class="gate-card card gradient-card">
		<Icon name="tabler:shield-lock-filled" class="gate-icon" />
		<h2 class="gate-title text-creative">
			密码保护
		</h2>
		<p class="gate-desc">
			本文已加密，输入密码以查看完整内容。
		</p>
		<p v-if="hint" class="gate-hint">
			<Icon name="tabler:bulb" />
			提示：{{ hint }}
		</p>

		<form class="gate-form" @submit.prevent="onSubmit">
			<input
				ref="input"
				v-model="password"
				type="password"
				class="gate-input"
				placeholder="请输入密码"
				autocomplete="off"
				:disabled="pending"
			>
			<ZButton
				class="gate-button"
				icon="tabler:lock-open"
				primary
				:disabled="pending || !password"
			>
				{{ pending ? '解密中…' : '解锁' }}
			</ZButton>
		</form>

		<Transition name="float-in">
			<p v-if="error" class="gate-error" role="alert">
				<Icon name="tabler:alert-circle" />
				{{ error }}
			</p>
		</Transition>

		<p class="gate-footer">
			<Icon name="tabler:info-circle" />
			密码仅缓存在本会话的 sessionStorage 中，关闭浏览器后失效。
		</p>
	</div>
</div>
</template>

<style lang="scss" scoped>
.password-gate {
	margin: 1em 0;
}

.gate-card {
	display: grid;
	justify-items: center;
	gap: 0.6em;
	padding: 2em 1.5em;
	text-align: center;
}

.gate-icon {
	font-size: 2.4em;
	color: var(--c-primary);
}

.gate-title {
	margin: 0;
	font-size: 1.4em;
	color: var(--c-text);
}

.gate-desc, .gate-hint, .gate-footer, .gate-error {
	margin: 0;
	font-size: 0.9em;
	color: var(--c-text-2);
}

.gate-hint {
	display: flex;
	align-items: center;
	gap: 0.3em;
	padding: 0.3em 0.8em;
	border-radius: 999px;
	background-color: var(--c-bg-2);
}

.gate-form {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.6em;
	width: 100%;
	max-width: 24em;
}

.gate-input {
	flex: 1 1 12em;
	min-width: 0;
	padding: 0.4em 0.8em;
	border: 1px solid var(--c-bg-soft);
	border-radius: 0.5em;
	background-color: var(--c-bg);
	font: inherit;
	color: var(--c-text);
	transition: border-color 0.2s;

	&:focus {
		border-color: var(--c-primary);
		outline: none;
	}

	&:disabled {
		color: var(--c-text-3);
	}
}

.gate-error {
	display: flex;
	align-items: center;
	gap: 0.3em;
	color: var(--c-error);
}

.gate-footer {
	display: flex;
	align-items: center;
	gap: 0.3em;
	font-size: 0.8em;
	color: var(--c-text-3);
}
</style>
