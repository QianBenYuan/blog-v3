import zin from '@zinkawaii/stylelint-config'

export default zin({
	// @keep-sorted
	rules: {
		'@stylistic/indentation': 'tab',
		// 工作区在 Windows 下是 CRLF，行尾交给 .editorconfig / 编辑器处理，这里不再报错
		'@stylistic/linebreaks': null,
		'media-feature-range-notation': 'prefix',
	},
})
