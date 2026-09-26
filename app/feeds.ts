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
	icon: getFavicon('blog.ss0t-hacked.top'),
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
				link: 'https://helloblog.88800001.xyz/',
				icon: getFavicon('helloblog.88800001.xyz'),
				avatar: 'https://tu.helloblog.de5.net/file/1788245385062_c722b895b298dc386f9914165629ccae.jpg',
				date: '2026-09-01',
			},
			{
				author: 'Zelia',
				title: 'Zelia',
				desc: '唯有行动才能解决所有的不安',
				link: 'https://zelia.top/',
				icon: getFavicon('zelia.top'),
				avatar: 'https://zelia.top/avatar.png',
				date: '2026-09-26',
			},
			{
				author: '芸璟',
				title: 'yun jing',
				desc: '芸璟的个人技术博客，记录 Web 安全、开发与学习笔记',
				link: 'https://zhonghai2006.github.io/boke-github.io/',
				icon: getFavicon('zhonghai2006.github.io'),
				avatar: 'https://zhonghai2006.github.io/boke-github.io/img/xiaobaobao.png',
				date: '2026-09-26',
			},
		],
	},
] satisfies FeedGroup[]
