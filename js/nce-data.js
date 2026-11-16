/* 新概念英语第一册 · 第 1–35 课单词
   根据家长提供的 5 页单词表整理：
   - 按课次顺序排列，游戏里新词也按课次出现
   - 同一课里重复的 big/small 已去重
   - 第 24 课的 cigarette（香烟）没有收录
   - 同形不同义（right/open/shut/empty/clean）保留为两个词条 */
(function () {
  'use strict';

  var raw = [
    { lesson: 1, words: [
      ['excuse', '原谅', '🙏'],
      ['me', '我（宾格）', '🙋'],
      ['yes', '是的', '✅'],
      ['is', '是（第三人称单数）', '🔤'],
      ['this', '这', '👉'],
      ['your', '你的；你们的', '🫵'],
      ['handbag', '（女用）手提包', '👜'],
      ['pardon', '原谅；请再说一遍', '🙏'],
      ['it', '它', '📦'],
      ['thank you', '感谢你（们）', '🙏'],
      ['very much', '非常地', '❤️']
    ]},
    { lesson: 2, words: [
      ['pen', '钢笔', '🖊️'],
      ['pencil', '铅笔', '✏️'],
      ['book', '书', '📖'],
      ['watch', '手表', '⌚'],
      ['coat', '上衣；外衣', '🧥'],
      ['dress', '连衣裙', '👗'],
      ['skirt', '裙子', '👚'],
      ['shirt', '衬衣', '👔'],
      ['car', '小汽车', '🚗'],
      ['house', '房子', '🏠']
    ]},
    { lesson: 3, words: [
      ['umbrella', '伞', '☂️'],
      ['please', '请', '🙏'],
      ['here', '这里', '📍'],
      ['my', '我的', '🫵'],
      ['ticket', '票', '🎫'],
      ['number', '号码', '🔢'],
      ['five', '五', '5️⃣'],
      ['sorry', '对不起的', '😔'],
      ['sir', '先生', '🎩'],
      ['cloakroom', '衣帽存放处', '🧥']
    ]},
    { lesson: 4, words: [
      ['suit', '一套衣服', '🤵'],
      ['school', '学校', '🏫'],
      ['teacher', '老师', '👩‍🏫'],
      ['son', '儿子', '👦'],
      ['daughter', '女儿', '👧']
    ]},
    { lesson: 5, words: [
      ['Mr.', '先生', '👨'],
      ['good', '好', '👍'],
      ['morning', '早晨', '🌅'],
      ['Miss', '小姐', '👩'],
      ['new', '新的', '✨'],
      ['student', '学生', '🎓'],
      ['French', '法国人', '🇫🇷'],
      ['German', '德国人', '🇩🇪'],
      ['nice', '美好的', '🌸'],
      ['meet', '遇见', '🤝'],
      ['Japanese', '日本人', '🇯🇵'],
      ['Korean', '韩国人', '🇰🇷'],
      ['Chinese', '中国人', '🇨🇳'],
      ['too', '也', '➕']
    ]},
    { lesson: 6, words: [
      ['make', '（产品的）牌号', '🏷️'],
      ['Swedish', '瑞典的', '🇸🇪'],
      ['English', '英国的', '🇬🇧'],
      ['American', '美国的', '🇺🇸'],
      ['Italian', '意大利的', '🇮🇹'],
      ['Volvo', '沃尔沃', '🚗'],
      ['Peugeot', '标致', '🚗'],
      ['Mercedes', '梅赛德斯', '🚗'],
      ['Toyota', '丰田', '🚗'],
      ['Daewoo', '大宇', '🚗'],
      ['Mini', '迷你', '🚗'],
      ['Ford', '福特', '🚗'],
      ['Fiat', '菲亚特', '🚗']
    ]},
    { lesson: 7, words: [
      ['I', '我', '🙋'],
      ['am', '是（第一人称单数）', '🔤'],
      ['are', '是（复数）', '🔤'],
      ['name', '名字', '🏷️'],
      ['what', '什么', '❓'],
      ['nationality', '国籍', '🌍'],
      ['job', '工作', '💼'],
      ['keyboard', '电脑键盘', '⌨️'],
      ['operator', '操作人员', '🧑‍💻'],
      ['engineer', '工程师', '👨‍🔧']
    ]},
    { lesson: 8, words: [
      ['policeman', '警察', '👮'],
      ['policewoman', '女警察', '👮‍♀️'],
      ['taxi driver', '出租汽车司机', '🚕'],
      ['air hostess', '空中小姐', '👩‍✈️'],
      ['postman', '邮递员', '📮'],
      ['nurse', '护士', '👩‍⚕️'],
      ['mechanic', '机械师', '🔧'],
      ['hairdresser', '理发师', '💇'],
      ['housewife', '家庭妇女', '🏠'],
      ['milkman', '送牛奶的人', '🥛']
    ]},
    { lesson: 9, words: [
      ['hello', '喂；你好', '👋'],
      ['hi', '喂；嗨', '👋'],
      ['how', '怎样', '❓'],
      ['today', '今天', '📅'],
      ['well', '身体好', '💪'],
      ['fine', '美好的', '👍'],
      ['thanks', '谢谢', '🙏'],
      ['goodbye', '再见', '👋'],
      ['see', '见', '👀']
    ]},
    { lesson: 10, words: [
      ['fat', '胖的', '🐷'],
      ['woman', '女人', '👩'],
      ['thin', '瘦的', '🪶'],
      ['tall', '高的', '🦒'],
      ['short', '矮的', '📏'],
      ['dirty', '脏的', '🧦'],
      ['clean', '干净的', '✨'],
      ['hot', '热的', '🥵'],
      ['cold', '冷的', '🥶'],
      ['old', '老的', '👴'],
      ['young', '年轻的', '👶'],
      ['busy', '忙的', '🏃'],
      ['lazy', '懒的', '😴']
    ]},
    { lesson: 11, words: [
      ['whose', '谁的', '❓'],
      ['blue', '蓝色的', '🔵'],
      ['perhaps', '大概', '🤔'],
      ['white', '白色的', '⚪'],
      ['catch', '抓住', '🫳']
    ]},
    { lesson: 12, words: [
      ['father', '父亲', '👨'],
      ['mother', '母亲', '👩'],
      ['blouse', '女衬衫', '👚'],
      ['sister', '姐；妹', '👧'],
      ['tie', '领带', '👔'],
      ['brother', '兄；弟', '👦'],
      ['his', '他的', '🫵'],
      ['her', '她的', '🫵']
    ]},
    { lesson: 13, words: [
      ['colour', '颜色', '🎨'],
      ['green', '绿色', '🟢'],
      ['come', '来', '🚶'],
      ['upstairs', '楼上', '⬆️'],
      ['smart', '时髦的；巧妙的', '😎'],
      ['hat', '帽子', '🎩'],
      ['same', '相同的', '🟰'],
      ['lovely', '可爱的；秀丽的', '🥰']
    ]},
    { lesson: 14, words: [
      ['case', '箱子', '🧳'],
      ['carpet', '地毯', '🟫'],
      ['dog', '狗', '🐶']
    ]},
    { lesson: 15, words: [
      ['Customs', '海关', '🛃'],
      ['officer', '官员', '🎖️'],
      ['girl', '女孩；姑娘', '👧'],
      ['Danish', '丹麦人', '🇩🇰'],
      ['friend', '朋友', '👫'],
      ['Norwegian', '挪威人', '🇳🇴'],
      ['passport', '护照', '🛂'],
      ['brown', '棕色的', '🟤'],
      ['tourist', '旅游者', '🧳']
    ]},
    { lesson: 16, words: [
      ['Russian', '俄罗斯人', '🇷🇺'],
      ['Dutch', '荷兰人', '🇳🇱'],
      ['these', '这些', '👉'],
      ['red', '红色的', '🔴'],
      ['grey', '灰色的', '🌫️'],
      ['yellow', '黄色的', '🟡'],
      ['black', '黑色的', '⚫'],
      ['orange', '橘黄色的', '🟠']
    ]},
    { lesson: 17, words: [
      ['employee', '雇员', '🧑‍💼'],
      ['hard-working', '勤奋的', '💪'],
      ['sales reps', '推销员', '💼'],
      ['man', '男人', '👨'],
      ['office', '办公室', '🏢'],
      ['assistant', '助手', '🧑‍💼']
    ]},
    { lesson: 19, words: [
      ['matter', '事情', '❓'],
      ['children', '孩子们', '🧒'],
      ['tired', '累；疲乏', '😴'],
      ['boy', '男孩', '👦'],
      ['thirsty', '渴的', '🥤'],
      ['mum', '妈妈（儿语）', '👩'],
      ['sit down', '坐下', '🪑'],
      ['right', '好；可以', '✅'],
      ['ice cream', '冰淇淋', '🍦']
    ]},
    { lesson: 20, words: [
      ['big', '大的', '🐘'],
      ['small', '小的', '🐜'],
      ['open', '开着的', '🚪'],
      ['shut', '关着的', '🚪'],
      ['light', '轻的', '🪶'],
      ['heavy', '重的', '🏋️'],
      ['long', '长的', '📏'],
      ['shoe', '鞋子', '👟'],
      ['grandfather', '祖父；外祖父', '👴'],
      ['grandmother', '祖母；外祖母', '👵']
    ]},
    { lesson: 21, words: [
      ['give', '给', '🎁'],
      ['one', '一个', '1️⃣'],
      ['which', '哪一个', '❓']
    ]},
    { lesson: 22, words: [
      ['empty', '空的', '📭'],
      ['full', '满的', '🔋'],
      ['large', '大的', '🐘'],
      ['little', '小的', '🐜'],
      ['sharp', '尖的；锋利的', '🔪'],
      ['small', '小的', '🐜'],
      ['big', '大的', '🐘'],
      ['blunt', '钝的', '🪵'],
      ['box', '盒子；箱子', '📦'],
      ['glass', '杯子', '🥃'],
      ['cup', '茶杯', '☕'],
      ['bottle', '瓶子', '🍾'],
      ['tin', '罐头', '🥫'],
      ['knife', '刀子', '🔪'],
      ['fork', '叉子', '🍴']
    ]},
    { lesson: 23, words: [
      ['on', '在…之上', '⬆️'],
      ['shelf', '架子；搁板', '🪜']
    ]},
    { lesson: 24, words: [
      ['desk', '课桌', '🪑'],
      ['table', '桌子', '🍽️'],
      ['plate', '盘子', '🍽️'],
      ['cupboard', '食橱', '🗄️'],
      ['television', '电视机', '📺'],
      ['floor', '地板', '🪵'],
      ['dressing table', '梳妆台', '🪞'],
      ['magazine', '杂志', '📖'],
      ['bed', '床', '🛏️'],
      ['newspaper', '报纸', '📰'],
      ['stereo', '立体声音响', '🎵']
    ]},
    { lesson: 25, words: [
      ['Mrs.', '夫人', '👩'],
      ['kitchen', '厨房', '🍳'],
      ['refrigerator', '电冰箱', '🧊'],
      ['right', '右边', '➡️'],
      ['electric', '带电的；可通电的', '⚡'],
      ['left', '左边', '⬅️'],
      ['cooker', '炉子；炊具', '🍳'],
      ['middle', '中间', '↔️'],
      ['of', '（属于）…的', '🔤'],
      ['room', '房间', '🚪']
    ]},
    { lesson: 26, words: [
      ['where', '在哪里', '📍'],
      ['in', '在…里', '📥']
    ]},
    { lesson: 27, words: [
      ['living room', '客厅', '🛋️'],
      ['near', '靠近', '📍'],
      ['window', '窗户', '🪟'],
      ['armchair', '手扶椅', '🛋️'],
      ['door', '门', '🚪'],
      ['picture', '图画', '🖼️'],
      ['wall', '墙', '🧱']
    ]},
    { lesson: 28, words: [
      ['trousers', '（复数）长裤', '👖']
    ]},
    { lesson: 29, words: [
      ['shut', '关门', '🚪'],
      ['bedroom', '卧室', '🛏️'],
      ['untidy', '乱；不整齐', '🧺'],
      ['must', '必须；应该', '❗'],
      ['open', '打开', '🚪'],
      ['air', '使…通风；换换空气', '🌬️'],
      ['put', '放置', '📥'],
      ['clothes', '衣服', '👕'],
      ['wardrobe', '大衣柜', '🗄️'],
      ['dust', '掸掉灰尘', '🧹'],
      ['sweep', '扫', '🧹']
    ]},
    { lesson: 30, words: [
      ['empty', '倒空；使…变空', '🫗'],
      ['read', '读', '📖'],
      ['sharpen', '削尖；使锋利', '✏️'],
      ['put on', '穿上', '👕'],
      ['take off', '脱掉', '🧥'],
      ['turn on', '开（电灯）', '💡'],
      ['turn off', '关（电灯）', '🌙']
    ]},
    { lesson: 31, words: [
      ['garden', '花园', '🌷'],
      ['under', '在…之下', '⬇️'],
      ['tree', '树', '🌳'],
      ['climb', '爬；攀登', '🧗'],
      ['who', '谁', '❓'],
      ['run', '跑', '🏃'],
      ['grass', '草；草地', '🌿'],
      ['after', '在…之后', '⏭️'],
      ['cat', '猫', '🐱']
    ]},
    { lesson: 32, words: [
      ['type', '打字', '⌨️'],
      ['letter', '信', '✉️'],
      ['basket', '篮子', '🧺'],
      ['eat', '吃', '🍴'],
      ['bone', '骨头', '🦴'],
      ['clean', '清洗', '🧼'],
      ['tooth', '牙齿', '🦷'],
      ['cook', '做（饭菜）', '🍳'],
      ['milk', '牛奶', '🥛'],
      ['meal', '饭；一顿饭', '🍱'],
      ['drink', '喝', '🥤'],
      ['tap', '（水）龙头', '🚰']
    ]},
    { lesson: 33, words: [
      ['day', '日子', '📅'],
      ['cloud', '云', '☁️'],
      ['sky', '天空', '🌤️'],
      ['sun', '太阳', '☀️'],
      ['shine', '照耀', '✨'],
      ['with', '和…在一起', '🤝'],
      ['family', '家庭（成员）', '👨‍👩‍👧'],
      ['walk', '走路；步行', '🚶'],
      ['over', '跨越；在…之上', '🌉'],
      ['bridge', '桥', '🌉'],
      ['boat', '船', '⛵'],
      ['river', '河', '🏞️'],
      ['ship', '轮船', '🚢'],
      ['aeroplane', '飞机', '✈️'],
      ['fly', '飞', '🕊️']
    ]},
    { lesson: 34, words: [
      ['sleep', '睡觉', '😴'],
      ['shave', '刮脸', '🪒'],
      ['cry', '哭；喊', '😢'],
      ['wash', '洗', '🧼'],
      ['wait', '等', '⏳'],
      ['jump', '跳', '🦘']
    ]},
    { lesson: 35, words: [
      ['photograph', '照片', '📸'],
      ['village', '村庄', '🏘️'],
      ['valley', '山谷', '🏞️'],
      ['between', '在…之间', '↔️'],
      ['hill', '小山', '⛰️'],
      ['another', '另一个', '➕']
    ]}
  ];

  var seenWords = {};
  var ids = {};
  var words = [];

  raw.forEach(function (unit) {
    var level = unit.lesson <= 10 ? 1 : (unit.lesson <= 20 ? 2 : 3);
    var bandStart = Math.floor((unit.lesson - 1) / 5) * 5 + 1;
    var cat = '第' + bandStart + '-' + (bandStart + 4) + '课';

    unit.words.forEach(function (row) {
      var en = row[0];
      var zh = row[1];
      var emoji = row[2] || '🧩';
      var key = en.toLowerCase() + '|' + zh;
      if (seenWords[key]) return;
      seenWords[key] = true;

      var baseId = en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!baseId) baseId = 'word';
      var id = baseId;
      var n = 2;
      while (ids[id]) { id = baseId + '_' + n; n++; }
      ids[id] = true;

      words.push({
        id: id,
        en: en,
        zh: zh,
        emoji: emoji,
        cat: cat,
        level: level,
        lesson: unit.lesson
      });
    });
  });

  window.WORD_HOUSE_DATA.words = words;
})();
