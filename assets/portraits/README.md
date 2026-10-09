# 人物原创立绘

当前总数 **64 张**，覆盖现有剧本的 48 名初始在籍人物及 16 名在野人物。新增黄忠、魏延、陆逊见 [final-talents-prompts.md](final-talents-prompts.md)。不代表所有三国人物已收录；后续新增角色仍需独立制作立绘。以下数量为历史批次记录。

最新总数 61 张，新增大乔、小乔、蔡琰。完整提示词与文件位置见 [women-talents-prompts.md](women-talents-prompts.md)。当前64名剧本人物剩余黄忠、魏延、陆逊3张待补；以下数量为历史批次记录。

最新总数 58 张，补充司马懿、徐晃、许褚、张辽。内置 image_gen 提示词及文件位置见 [wei-talents-prompts.md](wei-talents-prompts.md)。当前剧本剩余黄忠、魏延、陆逊、大乔、小乔、蔡琰 6 张待补。以下数量为历史批次记录。

最新总数 54 张，新增周瑜、孙权、孙尚香。内置 image_gen 完整提示词及文件位置见 [wu-talents-prompts.md](wu-talents-prompts.md)。64 名当前剧本人物中仍有 10 人立绘待补，以下数量为历史批次记录。

当前共 51 张：原 48 名初始在籍人物全部覆盖，新增在野人物中的张飞、诸葛亮、黄月英已接入。此次内置 image_gen 提示词与素材路径见 [shu-talents-prompts.md](shu-talents-prompts.md)。其余 13 名新增在野人物立绘待补。

新增士燮、士壹、士徽，完整提示词与文件名见 [shi-prompts.md](shi-prompts.md)。当前共 48 张，覆盖 16 个势力的全部 48 名初始人物；这不代表所有三国人物均已收录。以下数量为各批次完成时记录。

新增张燕、于毒、白绕，完整提示词见 [zhang-yan-prompts.md](zhang-yan-prompts.md)，当前合计 45 张。刘繇、张英、樊能见 [liu-yao-prompts.md](liu-yao-prompts.md)，张鲁、阎圃、张琪瑛见 [zhang-lu-prompts.md](zhang-lu-prompts.md)，陶谦、陈登、糜贞见 [tao-prompts.md](tao-prompts.md)，孔融、王修、太史慈见 [kong-prompts.md](kong-prompts.md)，赵云、公孙瓒、田楷见 [gongsun-prompts.md](gongsun-prompts.md)。

此前补充刘焉、吴苋、赵韪，完整提示词见 [liu-yan-prompts.md](liu-yan-prompts.md)。仍未覆盖全体角色。马腾、马超、马云禄见 [ma-prompts.md](ma-prompts.md)，马云禄为文学演绎角色。此前袁术、纪灵、阎象见 [yuan-shu-prompts.md](yuan-shu-prompts.md)，刘表、蒯良、蔡夫人见 [liu-biao-prompts.md](liu-biao-prompts.md)。

此前批次：刘备、关羽、甘夫人、孙坚、程普、吴夫人的素材与完整提示词见 [liu-sun-prompts.md](liu-sun-prompts.md)；董卓、吕布、貂蝉、袁绍、田丰、甄宓见 [dong-yuan-prompts.md](dong-yuan-prompts.md)。

使用内置 image_gen 生成原创历史题材艺术演绎，并非历史人物真实肖像或现有游戏素材。人物面板首次接入曹操、荀彧、卞夫人；其余人物明确显示待补，不以重复头像冒充完整立绘。幼年人物不使用成人立绘。

原始 PNG 保存在本目录；页面 JPEG 位于 `apps/web/public/images/portraits/`，使用 sips 以质量 80 转码，不裁剪、不缩放。1024×1536，单张约 468–490 KiB，按需懒加载。

## 生成提示词

### caocao

Use case: historical-scene. Asset type: original character portrait for a Chinese Three Kingdoms grand-strategy game's personnel panel. Subject: Cao Cao (曹操), an adult Chinese male ruler around age 40, perceptive narrow eyes, dignified firm expression, trimmed moustache and short pointed beard, dark hair in a restrained late Eastern Han court headpiece. Three-quarter waist-up portrait, head and headpiece fully visible with generous margin, hands outside frame. Dark charcoal cross-collar Han robe, subtle aged bronze woven trim, muted deep red underlayer. Painterly realism with Chinese ink-wash edges, refined facial anatomy, natural skin and silk texture, soft side light, matte low-saturation palette, warm pale parchment background with very faint ink landscape. Not a photo, not anime, no plastic rendering, no fluorescent glow, no fantasy armor, no Qing hairstyle, no text, no border, no watermark. One single character only, vertical portrait composition. Original interpretation, do not copy any existing videogame portrait.

### xunyu

Use case: historical-scene. Asset type: original Three Kingdoms strategy-game character portrait. Subject Xun Yu (荀彧), adult Chinese male scholar-official around 35, slender face, composed thoughtful eyes, refined straight eyebrows, neat narrow moustache and small beard. Dark hair in a restrained Eastern Han scholar cap, crossed-collar muted blue-grey silk robe, subtle dark embroidered trim. One person only, waist-up three-quarter portrait, full headpiece visible with margin, hands outside frame. Painterly realism, fine natural skin and silk texture, Chinese ink-wash edges, soft side lighting, matte restrained palette, warm pale parchment backdrop and very faint misty landscape. Dignified statesman rather than armored warrior. Original interpretation, no existing game likeness, no text, no frame, no watermark, no anime, no fluorescent glow, no Qing clothing. Vertical composition.

### lady-bian

Use case: historical-scene. Asset type: original Three Kingdoms strategy-game character portrait. Subject Lady Bian (卞夫人), adult Chinese noblewoman around 35, poised intelligent expression, warm dignified gaze, subtle natural facial texture, dark hair in a modest Eastern Han updo with simple jade and bronze hairpins. Fully clothed in a layered crossed-collar Han robe of muted wine-red and warm cream silk, delicate restrained woven border. One person only, waist-up three-quarter portrait, complete hair and head visible with margins, hands outside frame. Painterly realism with Chinese ink-wash edges, softly lit, no beauty-filter plastic skin, warm pale parchment background and very faint bamboo ink landscape. Original character interpretation, not a copy of any game portrait. No text, no border, no watermark, no anime, no extravagant fantasy crown, no revealing neckline, no Qing clothing. Vertical composition.
