import type { Parent, Root, RootContent, Text } from 'mdast'
import { visit } from 'unist-util-visit'

interface HighlightNode extends Parent {
	type: 'highlight'
	children: Text[]
}

declare module 'mdast' {
	interface RootContentMap {
		highlight: HighlightNode
	}
}

/**
 * Typora 的高亮写法。
 * 两侧的 `==` 必须紧贴非空白字符（`==文字==` 生效，`== 文字 ==` 不生效），与 Typora 的行为一致。
 */
const highlightRe = /==(?=\S)([^\n]*?)(?<=\S)==/g

/**
 * 把 `==文字==` 转成 <mark>，让 Typora 里标的重点在博客上照样高亮。
 *
 * 只替换 text 节点，所以代码块和行内代码里的 `==`（例如 Python 的 `a==b`）不会被动到。
 */
export default function remarkHighlight() {
	return (tree: Root) => {
		visit(tree, 'text', (node: Text, index, parent) => {
			if (!parent || index === undefined || !node.value.includes('=='))
				return

			const nodes: RootContent[] = []
			const value = node.value
			let last = 0

			highlightRe.lastIndex = 0
			for (let match = highlightRe.exec(value); match; match = highlightRe.exec(value)) {
				if (match.index > last)
					nodes.push({ type: 'text', value: value.slice(last, match.index) })

				nodes.push({
					type: 'highlight',
					children: [{ type: 'text', value: match[1] ?? '' }],
					data: { hName: 'mark' },
				})
				last = match.index + match[0].length
			}

			if (!nodes.length)
				return

			if (last < value.length)
				nodes.push({ type: 'text', value: value.slice(last) })

			parent.children.splice(index, 1, ...nodes)
			return index + nodes.length
		})
	}
}
