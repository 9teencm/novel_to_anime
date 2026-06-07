export const STORIES = [
  {
    id: "abyss",
    title: "玄幻修真《禁地深淵》",
    genre: "玄幻 / 冒險",
    author: "天辰大帝",
    description: "年輕修仙者蕭晨與師妹靈兒闖入上古禁地，遭遇守護神獸，生死邊緣激發護體神盾。",
    content: `第一章：禁地深淵之秘。
夜色如墨，狂風呼嘯。在青雲山後山的禁地深淵入口，兩道身影正並肩而立。
蕭晨一身玄青色長袍，一頭銀色長髮在狂風中獵獵作響。他手持青鋒劍，雙眸冷若寒星，警惕地盯著深淵下翻滾的黑霧。
「師妹，跟緊我，這裡面的氣息非常古怪。」蕭晨低聲叮嚀，聲音帶著一絲不容置疑的沉穩。
在大樓後山禁地，靈兒一身翠綠色長裙，扎著雙馬尾，雙手緊緊抓著蕭晨的衣角，精緻的俏臉上滿是焦慮與緊張：「師兄，我感覺這霧氣裡有東西在看著我們... 我們真的要進去嗎？」
突然，黑霧劇烈翻滾起來，一雙巨大的猩紅眼眸在深淵深處緩緩睜開，伴隨而來的是一聲震耳欲聾的獸吼！
林木瞬間被震得粉碎。靈兒驚呼一聲，險些跌倒。
蕭晨面色一凜，一步邁出擋在靈兒身前，左手掐訣，一聲低喝：「妖孽，退下！」
嗡！一聲清脆的鳴響，一道璀璨的金黃色防禦光罩瞬間在兩人身前展開，將迎面襲來的飛石黑氣盡數擋下。金光照亮了蕭晨堅毅的側臉...`,
    characters: [
      {
        name: "蕭晨",
        role: "主角",
        appearance: "A handsome 20-year-old cultivator boy, long messy silver hair, cold blue eyes, wearing a dark blue long cultivation robe, holding a glowing chinese sword.",
        personality: "冷靜、沉穩、有擔當、實力深藏不露",
        relationship: "靈兒的師兄，對師妹有強烈的保護欲",
        locks: { face: true, outfit: true, voice: true }
      },
      {
        name: "靈兒",
        role: "女主角 / 配角",
        appearance: "A beautiful 18-year-old Chinese girl, black hair tied in double ponytails (twin-tails), wearing a light green traditional dress, big worried brown eyes.",
        personality: "活潑、善良、有些膽小但信任師兄",
        relationship: "蕭晨的師妹，依賴師兄",
        locks: { face: true, outfit: true, voice: false }
      }
    ],
    world_rules: [
      "青雲禁地法則：黑霧會吞噬神識與靈力，能見度極低。",
      "修真等級：以靈光盾光芒區分實力，金黃色代表結丹期圓滿防禦靈光。"
    ],
    scenes: [
      {
        id: 1,
        location: "青雲山後山 - 禁地深淵入口",
        time: "狂風呼嘯的深夜",
        atmosphere: "迷霧籠罩、陰森壓抑，周圍是乾枯的古木",
        camera: {
          angle: "遠景 (Wide angle shot)",
          movement: "慢速推近 (Slow zoom in)"
        },
        dialogue: "旁白：「夜色如墨，狂風呼嘯。青雲後山深淵入口，兩道身影正並肩而立...」\n蕭晨：「師妹，跟緊我，這裡面的氣息非常古怪。」",
        characters: ["蕭晨", "靈兒"],
        image_prompt: "Wide shot of a dark foggy mountain abyss entrance at night, windy weather, a silver-haired boy in a dark blue cultivation robe holding a sword standing next to a black-haired girl in a green dress, detailed anime style, dramatic lighting, 8k"
      },
      {
        id: 2,
        location: "深淵入口前方",
        time: "深夜",
        atmosphere: "極度緊張，狂風肆虐",
        camera: {
          angle: "中景 (Medium shot)",
          movement: "電影級橫移 (Cinematic pan)"
        },
        dialogue: "靈兒：「師兄，我感覺這霧氣裡有東西在看著我們... 我們真的要進去嗎？」",
        characters: ["靈兒"],
        image_prompt: "Medium shot of an 18-year-old Chinese girl named Ling Er with twin-tails, wearing a green dress, grabbing a boy's sleeve, big worried brown eyes, dark misty background, anime style, high quality"
      },
      {
        id: 3,
        location: "深淵黑霧中",
        time: "深夜",
        atmosphere: "恐怖、巨獸現身",
        camera: {
          angle: "低角度仰視 (Low angle shot)",
          movement: "鏡頭震動 (Camera shake)"
        },
        dialogue: "旁白：「突然，黑霧劇烈翻滾起來！一雙巨大的猩紅眼眸在深淵深處睜開，伴隨而來的是一聲震耳欲聾的獸吼！」",
        characters: [],
        image_prompt: "Low angle shot of two huge glowing red eyes opening inside thick black rolling fog, dark environment, wind blowing dust, epic scales, ominous anime concept art"
      },
      {
        id: 4,
        location: "深淵入口前方",
        time: "深夜",
        atmosphere: "危機爆發，魔法光芒",
        camera: {
          angle: "特寫 (Close-up shot)",
          movement: "快速變焦 (Quick push in)"
        },
        dialogue: "蕭晨：「妖孽，退下！」\n旁白：「蕭晨一步邁出擋在師妹身前，左手掐訣，金黃色防禦光罩瞬間展開！」",
        characters: ["蕭晨"],
        image_prompt: "Close-up shot of a 20-year-old cultivator boy named Xiao Chen with messy silver hair, cold blue eyes, creating a glowing gold magical energy shield in front of him, gold light reflecting on his face, determined expression, anime style, highly detailed"
      }
    ],
    logs: [
      "[系統] 啟動 Novel-to-Animation OS Multi-Agent 管道...",
      "[小說分析員] 正在解析小說內容... 提取世界觀與角色設定。",
      "[小說分析員] 找到角色：【蕭晨】，定位為主角，外貌特徵為銀髮、玄青色長袍、手持青鋒劍，性格沉穩。",
      "[小說分析員] 找到角色：【靈兒】，定位為師妹（配角），外貌特徵為翠綠長裙、雙馬尾，性格緊張膽小。",
      "[小說分析員] 世界觀規則提取完成：提取出青雲山禁地與防禦法術金黃光罩設定。",
      "[動畫改編員] 正在將文字情節轉換為場景... 拆分完成，共 4 個場景片段。",
      "[動畫改編員] 分段 1：蕭晨與靈兒立於入口 -> 分段 2：靈兒表達恐懼拉扯衣角 -> 分段 3：巨獸吼叫紅眼睜開 -> 分段 4：蕭晨施展盾牌擋駕。",
      "[動畫導演] 正在加入鏡頭軌跡與氣氛控制...",
      "[動畫導演] 設定 Scene 1 使用 Slow Zoom In，引導觀眾進入禁地氛圍。Scene 3 巨獸吼叫使用 Camera Shake 以強化震懾感。",
      "[一致性管理員] 正在套用角色特徵，鎖定蕭晨的 [銀髮/藍眼] 與靈兒的 [雙馬尾/綠裙]，生成生圖 prompt...",
      "[一致性管理員] 成功將 Prompt 與運鏡描述（例如 'Low angle shot', 'Anime style'）融合，保持畫風一致性。",
      "[系統] CrewAI 順利執行完成，已將數據打包傳送至時間軸編輯器。"
    ]
  },
  {
    id: "cyberpunk",
    title: "科幻賽博《霓虹影刃》",
    genre: "賽博朋克 / 科幻 / 動作",
    author: "碳基芯片",
    description: "女駭客／忍者「影刃」深夜潛入荒坂科技大樓，在警報拉響的瞬間利用電磁鉤爪在摩天大樓外牆飛簷走壁。",
    content: `第一章：大樓外牆的舞者。
雨下的很大，霓虹燈光透過雨幕折射出怪異的紫紅色。
影刃貼在荒坂科技總部大樓 88 層的玻璃幕牆外側。她戴著發光的機械狐狸面具，隱約露出幾縷粉紅色的姬髮式劉海。一身緊身黑鈦夜行衣勾勒出她靈活的線條，機械手臂上正閃爍著幽藍色的數據流。
「核心防火牆已經破解，我有三分鐘時間。」影刃在通訊頻道中低語，聲音冷酷而輕快。
突然，大樓外牆的探照燈瞬間變為血紅色，刺耳的蜂鳴警報聲撕裂了雨夜。
「警報！未授權入侵！」擴音器響起。
一架荒坂巡邏無人機亮著紅色掃描光束，從大樓轉角急速飛來，機槍口已經開始旋轉。
影刃冷笑一聲，沒有絲毫慌亂。她腳下一蹬，身體向後騰空躍入百米高空。在重力將她拉下之前，她抬手對準上方的鋼骨結構扣動扳機。
哧！電磁鉤爪索急速射出，牢牢咬住橫樑。影刃宛如一隻雨夜中的黑蝴蝶，在霓虹閃耀的摩天大樓間劃過一道完美的弧線...`,
    characters: [
      {
        name: "影刃",
        role: "主角",
        appearance: "A cool cyberpunk girl named Shadow Blade, glowing neon fox mask, pink hime-cut hair bang visible, wearing a futuristic black stealth tactical suit, cybernetic robotic left arm with blue LED lights.",
        personality: "冷酷、自信、身手矯捷、精通駭客技術",
        relationship: "獨自行動的傭兵",
        locks: { face: true, outfit: true, voice: true }
      }
    ],
    world_rules: [
      "賽博朋克世界觀：雨夜、霓虹閃爍、荒坂科技大樓、無人機巡邏。",
      "科技設定：電磁鉤爪槍、發光狐狸面具、黑鈦防護服。"
    ],
    scenes: [
      {
        id: 1,
        location: "荒坂科技大樓 88 層幕牆外側",
        time: "雨夜",
        atmosphere: "霓虹折射的紫紅色調、密集的雨絲、高空狂風",
        camera: {
          angle: "俯角特寫 (High angle close-up)",
          movement: "緩慢橫移 (Slow pan)"
        },
        dialogue: "影刃：「核心防火牆已經破解，我有三分鐘時間。」\n旁白：「黑鈦夜行服與發光的狐狸面具，影刃貼在大樓玻璃幕牆外，宛如霓虹中的幽靈...」",
        characters: ["影刃"],
        image_prompt: "High angle close-up of a cyberpunk girl with a glowing neon fox mask, pink hime-cut hair bang visible, black stealth suit, robotic cybernetic arm glowing blue, rain dripping, purple and blue neon lights reflections, futuristic skyscrapers background, anime key art"
      },
      {
        id: 2,
        location: "荒坂科技大樓外牆",
        time: "雨夜",
        atmosphere: "警訊警報拉響、探照燈切換為紅色、極度危險",
        camera: {
          angle: "仰視中景 (Low angle medium shot)",
          movement: "鏡頭跟隨 (Tracking shot)"
        },
        dialogue: "警報系統：「警報！未授權入侵！」\n旁白：「突然探照燈光轉紅，警報聲震耳欲聾，一架重武裝無人機包抄而來！」",
        characters: [],
        image_prompt: "A futuristic police drone with a rotating red scanner laser gun flying through rainy night sky, scanning a glass building facade flashing red warning lights, cyberpunk cityscape, anime style"
      },
      {
        id: 3,
        location: "高空中 / 大樓牆外",
        time: "雨夜",
        atmosphere: "驚險刺激、動作動態感強",
        camera: {
          angle: "廣角遠景 (Wide angle shot)",
          movement: "動態跟蹤 (Dynamic follow)"
        },
        dialogue: "旁白：「影刃騰空躍入百米高空，甩開重力。哧！電磁鉤爪索急速射出，拉扯著她在霓虹閃耀的大樓間盪起一道弧線！」",
        characters: ["影刃"],
        image_prompt: "Wide action shot of a girl with pink hair and a glowing fox mask swinging in mid-air using a grapple wire between massive cyberpunk skyscrapers, pouring rain, neon sign reflections in wet air, dynamic pose, high-octane anime sequence"
      }
    ],
    logs: [
      "[系統] 啟動 Novel-to-Animation OS Multi-Agent 管道...",
      "[小說分析員] 提取主角：【影刃】，特徵：狐狸發光面具、粉色劉海、黑鈦夜行衣、藍光機械手臂，冷酷且矯捷。",
      "[小說分析員] 環境提取：荒坂科技總部、高空、雨夜、霓虹閃爍、無人機警報。",
      "[動畫改編員] 將情節改編為 3 幕主要動態場景。",
      "[動畫導演] 配置 Scene 1 使用 High angle close-up 呈現高度感與緊張感，Scene 3 使用動態 Wide shot 展現鉤爪飛盪的爆發力與速度。",
      "[一致性管理員] 整合【粉髮+狐狸面具】造型特徵至英文 Prompt 描述中，結合賽博朋克雨夜光效後綴。",
      "[系統] 執行完成。生成 JSON 分鏡數據。"
    ]
  }
];
