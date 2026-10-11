<script setup lang="ts">
/**
 * 进站加载动画（仅客户端）：全屏视频背景 + 樱花瓣 + 水波冲击环 + 逐行开机日志 + ACCESS GRANTED。
 * 是否播放由 nuxt.config head 里的内联脚本决定（给 <html> 加 splash-running，一次会话只播一次），
 * 本组件只负责把舞台挂到 DOM、播放并收尾；点击 / Enter / Esc / 空格可跳过。
 */
const LOGO = 'QBY'
const POSTER = '/assets/boot-loader/moe-poster.jpg'
const VIDEO = '/assets/boot-loader/moe-crop.mp4'

// 逐行日志：[文本, 状态标签]
const LINES: Array<[string, string]> = [
	['> init kernel ................ ', '[ ok ]'],
	['> mount /dev/qianbenyuan ..... ', '[ ok ]'],
	['> load modules ctf|web|crypto ', '[ ok ]'],
	['> summon moyi.exe ............ ', '[ ok ]'],
	['> loading anime wallpapers ... ', '[ ok ]'],
	['> verify signature ........... ', '[ ok ]'],
	['> decode moe stream .......... ', '[ ok ]'],
	['> establish kawaii link ...... ', '[ ok ]'],
	['> access qianbenyuan.sec ..... ', 'GRANTED'],
]

onMounted(() => {
	const html = document.documentElement
	if (!html.classList.contains('splash-running'))
		return

	const smallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches

	const wrap = document.createElement('div')
	wrap.id = 'qby-splash'
	wrap.innerHTML
		= `<img class="vs-bgimg" src="${POSTER}" alt="">${
			smallScreen ? '' : `<video class="vs-bg" src="${VIDEO}" muted loop playsinline preload="auto"></video>`
		}<div class="vs-shade"></div>`
		+ `<div class="vs-petals"></div>`
		+ `<div class="vs-stage">`
		+ `<div class="vs-rings"><i></i><i></i></div>`
		+ `<div class="vs-logo" data-text="${LOGO}">${LOGO}<span class="vs-cursor">&nbsp;</span></div>`
		+ `<pre class="vs-term"></pre>`
		+ `<div class="vs-granted">ACCESS GRANTED</div>`
		+ `<div class="vs-tip">click / any key to skip</div>`
		+ `</div>`
		+ `<div class="vs-progress"><i></i></div>`
	html.appendChild(wrap)

	// 樱花瓣：随机位置 / 速度 / 大小
	const petalBox = wrap.querySelector('.vs-petals')
	for (let k = 0; k < 16; k++) {
		const petal = document.createElement('i')
		const size = 7 + Math.random() * 9
		petal.style.cssText
			= `left:${Math.random() * 100}%;`
				+ `width:${size}px;height:${size}px;`
				+ `animation-duration:${2.6 + Math.random() * 2.6}s;`
				+ `animation-delay:-${Math.random() * 5}s;`
				+ `opacity:${(0.5 + Math.random() * 0.4).toFixed(2)}`
		petalBox?.appendChild(petal)
	}

	// 视频：就绪后淡入；被浏览器策略拦下则移除，留静态图兜底
	const vid = wrap.querySelector('.vs-bg') as HTMLVideoElement | null
	let vidReady = false
	if (vid) {
		vid.addEventListener('canplay', () => {
			vidReady = true
			vid.classList.add('vs-ready')
		})
		vid.play()?.catch(() => vid.remove())
	}

	const term = wrap.querySelector('.vs-term') as HTMLElement
	const granted = wrap.querySelector('.vs-granted') as HTMLElement

	let timer: ReturnType<typeof setInterval> | null = null
	let gate: ReturnType<typeof setInterval> | null = null
	let finished = false

	function finish() {
		if (finished)
			return
		finished = true
		if (timer)
			clearInterval(timer)
		if (gate)
			clearInterval(gate)
		document.removeEventListener('keydown', onKey)
		html.classList.add('splash-fade')
		try {
			sessionStorage.setItem('qby-splash-complete', 'true')
		}
		catch {}
		setTimeout(() => {
			html.classList.remove('splash-running', 'splash-fade')
			wrap.remove()
		}, 650)
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
			e.preventDefault()
			finish()
		}
	}
	wrap.addEventListener('click', finish)
	document.addEventListener('keydown', onKey)

	function startSequence() {
		let i = 0
		timer = setInterval(() => {
			if (i >= LINES.length) {
				if (timer)
					clearInterval(timer)
				timer = null
				term.style.opacity = '0.12'
				granted.classList.add('vs-show')
				setTimeout(finish, 1700)
				return
			}
			const row = document.createElement('div')
			row.className = 'vs-line'
			row.textContent = LINES[i][0]
			const ok = document.createElement('span')
			ok.className = 'vs-ok'
			ok.textContent = LINES[i][1]
			row.appendChild(ok)
			term.appendChild(row)
			i++
		}, 300)
	}

	// 等视频就绪再开始日志；视频慢 / 失败最多等 0.9 秒照常开始
	let waited = 0
	gate = setInterval(() => {
		waited += 100
		if (vidReady || !vid || !vid.parentNode || waited >= 900) {
			if (gate)
				clearInterval(gate)
			gate = null
			startSequence()
		}
	}, 100)

	// 保底：无论发生什么，7 秒后一定结束
	setTimeout(finish, 7000)
})
</script>

<template>
<i hidden aria-hidden="true" />
</template>
