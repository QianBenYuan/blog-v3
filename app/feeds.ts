import type { FeedGroup } from '../app/types/feed'
// 友链检测 CLI 需要使用显式导入和相对路径
import { myFeed } from '../blog.config'
// eslint-disable-next-line unused-imports/no-unused-imports
import { getFavicon, getGithubAvatar, getGithubIcon, getOciqGroupAvatar, getOicqAvatar, OicqAvatarSize } from './utils/img'

const selfFeed = {
	author: 'HACKED',
	sitenick: 'HACKED',
	title: "HACKED's Blog",
	desc: '一个刚刚入门的pwner，大手子ddw',
	link: 'https://blog.ss0t-hacked.top',
	avatar: 'https://q1.qlogo.cn/g?b=qq&nk=3255154997&s=640',
	archs: ['Nuxt', 'Vercel'],
	date: '2026-07-20',
	comment: '这是我自己',
} as const

export default [
	{
		name: '我的博客',
		desc: '我自己搭建的个人博客。',
		entries: [
			myFeed,
		],
	},
	{
		name: '友链',
		desc: '校友',
		entries: [
			selfFeed,
			{
				author: 'iss-xx',
				title: 'iss-xx',
				desc: 'web安全菜鸟打怪升级日记',
				link: 'https://iss-xx.xin/',
				icon: getFavicon('iss-xx.xin'),
				avatar: 'https://github.com/iss-xx/picx-images-hosting/raw/master/头像.4xvac2bgrs.webp',
				date: '2026-09-01',
			},
			{
				author: 'Nikki',
				title: 'Nikki',
				desc: "it's Nikki blog",
				link: 'https://helloblog.de5.net/',
				icon: getFavicon('helloblog.de5.net'),
				avatar: 'https://tu.helloblog.de5.net/file/1788245385062_c722b895b298dc386f9914165629ccae.jpg',
				date: '2026-09-01',
			},
		],
	},
] satisfies FeedGroup[]
