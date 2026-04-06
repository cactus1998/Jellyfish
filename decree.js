const { EmbedBuilder } = require('discord.js');

// 指令定義
const decreeCommand = {
    name: '水母女王指引',
    description: '向水母女王尋求指引',
    options: [
        {
            name: 'question',
            description: '你想請教水母女王的問題',
            type: 3, // String
            required: true
        }
    ]
};

// 無理頭答案清單
const answers = [
    "問得好，但我不想回答。", "擲筊可能比較快。", "去問你媽啦，她可能知道。", "你的問題讓我翻了個白眼。", "這種問題你還是去問神奇海螺吧。", 
    "今天公休，明天請早。", "答案被我吃掉了。", "（已讀不回）", "我要去洗澡了", "是", "不是", "不知道", "我不知道", 
    "擲個硬幣吧，雖然結果可能還是不準。", "就算知道答案，你也不會照做的。", "先轉帳 500 塊再來問。", "你的問題太深奧了，我需要十年來思考。", 
    "這題跳過，下一題。", "連這種問題都要問？", "你去問樓下管理員比較快。", "為什麼要問我？我又不是你媽。", "如果我是你，我就不會問這個。",
];

// 處理函數
async function executeDecree(interaction) {
    console.log(`[Decree] 正在執行 executeDecree...`);
    const question = interaction.options.getString('question');
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
    console.log(`[Decree] 收到問題: ${question}, 隨機回答: ${randomAnswer}`);

    const embed = new EmbedBuilder()
        .setTitle('水母女王')
        .setColor('#00FFFF') // 青色，符合水母/水流感
        .addFields(
            { name: '🤔 你的疑問', value: `\`${question}\`` },
            { name: '📜 女王指引', value: `**${randomAnswer}**` }
        )
        .setFooter({ text: 'Jellyfish 隨機指引系統', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    decreeCommand,
    executeDecree
};
