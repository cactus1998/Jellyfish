// 【1. 引入必要的套件與環境變數】
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { decreeCommand, executeDecree } = require('./decree.js');

// 初始化機器人客戶端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.GuildMember, Partials.Presence]        
});

const configPath = path.join(__dirname, 'config.json');
const dataPath = path.join(__dirname, 'data.json');

// 確保數據檔案存在
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ peakCount: 0, peakTimestamp: null, birthdays: {}, lastBirthdayCheck: null }, null, 2));
}

// ==========================================
// 【註冊斜線指令資料表】
// ==========================================
const commands = [
    {
        name: 'peak',
        description: '查看本伺服器的最高同時在線人數紀錄 (每 30 分鐘更新一次)'
    },
    {
        name: 'setchannel',
        description: '設定用於顯示最高人數的語音頻道',
        options: [
            {
                name: 'channel',
                description: '選擇一個語音頻道',
                type: 7, // Channel
                channel_types: [2], // Voice channel only
                required: true
            }
        ]
    },
    {
        name: 'setcurrent',
        description: '設定用於顯示當前人數的語音頻道',
        options: [
            {
                name: 'channel',
                description: '選擇一個語音頻道',
                type: 7, // Channel
                channel_types: [2], // Voice channel only
                required: true
            }
        ]
    },
    {
        name: 'online',
        description: '查看目前的在線人數 (每 30 分鐘更新一次)'
    },
    {
        name: 'setbirthday',
        description: '設定您的生日，讓機器人在當天為您慶祝！',
        options: [
            {
                name: 'month',
                description: '出生月份 (1-12)',
                type: 4, // Integer
                required: true,
                min_value: 1,
                max_value: 12
            },
            {
                name: 'day',
                description: '出生日期 (1-31)',
                type: 4, // Integer
                required: true,
                min_value: 1,
                max_value: 31
            }
        ]
    },
    {
        name: 'birthday_channel',
        description: '設定發送生日祝賀訊息的文字頻道',
        options: [
            {
                name: 'channel',
                description: '選擇一個文字頻道',
                type: 7, // Channel
                channel_types: [0], // Text channel only
                required: true
            }
        ]
    },
    {
        name: 'admin_setbirthday',
        description: '管理員設定指定成員的生日',
        options: [
            {
                name: 'user',
                description: '選擇要設定生日的成員',
                type: 6, // User
                required: true
            },
            {
                name: 'month',
                description: '出生月份 (1-12)',
                type: 4, // Integer
                required: true,
                min_value: 1,
                max_value: 12
            },
            {
                name: 'day',
                description: '出生日期 (1-31)',
                type: 4, // Integer
                required: true,
                min_value: 1,
                max_value: 31
            }
        ]
    },
    {
        name: 'birthday_countdown',
        description: '查看指定成員距離下次生日還有多少天',
        options: [
            {
                name: 'user',
                description: '選擇要查看倒數的成員',
                type: 6, // User
                required: true
            }
        ]
    },
    {
        name: 'set_reminder',
        description: '設定每日任務提醒 (每 30 分鐘檢查一次，管理員專用)',
        options: [
            {
                name: 'user',
                description: '選擇要提醒的成員',
                type: 6, // User
                required: true
            },
            {
                name: 'hour',
                description: '小時 (0-23)',
                type: 4, // Integer
                required: true,
                min_value: 0,
                max_value: 23
            },
            {
                name: 'minute',
                description: '分鐘 (0-59)',
                type: 4, // Integer
                required: true,
                min_value: 0,
                max_value: 59
            }
        ]
    },
    {
        name: 'remove_reminder',
        description: '移除指定的任務提醒 (僅限管理員)',
        options: [
            {
                name: 'user',
                description: '選擇要移除提醒的成員',
                type: 6, // User
                required: true
            }
        ]
    },
    {
        name: 'list_reminders',
        description: '列出目前所有的任務提醒'
    },
    {
        name: 'reminder_channel',
        description: '設定任務提醒發送的文字頻道 (僅限管理員)',
        options: [
            {
                name: 'channel',
                description: '選擇一個文字頻道',
                type: 7, // Channel
                channel_types: [0], // Text channel only
                required: true
            }
        ]
    },
    decreeCommand // 新增的水木女王聖旨指令
];

// ==========================================
// 【功能函數：計算與更新最高人數】
// ==========================================
async function updateCounts(guild, currentCount) {
    let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // 更新最高紀錄
    let isNewPeak = false;
    if (currentCount > data.peakCount) {
        data.peakCount = currentCount;
        data.peakTimestamp = new Date().toISOString();
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log(`📈 偵測到新紀錄！最高在線人數已更新為: ${currentCount}`);
        isNewPeak = true;
    }

    // 更新最高人數頻道名稱
    if (config.voiceChannelId) {
        try {
            const channel = await guild.channels.fetch(config.voiceChannelId);
            if (channel) {
                const newName = `最高在線人數: ${data.peakCount}`;
                if (channel.name !== newName) {
                    await channel.setName(newName);
                    console.log(`🔊 已更新最高人數頻道: ${newName}`);
                }
            }
        } catch (err) {
            console.error('❌ 無法更新語音頻道名稱 (最高人數):', err);
        }
    }

    // 更新當前人數頻道名稱
    if (config.currentCountChannelId) {
        try {
            const channel = await guild.channels.fetch(config.currentCountChannelId);
            if (channel) {
                const newName = `當前在線人數: ${currentCount}`;
                if (channel.name !== newName) {
                    await channel.setName(newName);
                    console.log(`🔊 已更新當前人數頻道: ${newName}`);
                }
            }
        } catch (err) {
            console.error('❌ 無法更新語音頻道名稱 (當前人數):', err);
        }
    }
    return isNewPeak;
}

// ==========================================
// 【功能函數：生日檢查】
// ==========================================
async function checkBirthdays() {
    console.log('🎂 正在檢查今天的生日...');
    let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!config.birthdayChannelId) return;

    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 如果今天已經檢查過了，就不再重複發送
    if (data.lastBirthdayCheck === dateKey) {
        console.log('✅ 今天已經發送過生日祝賀了。');
        return;
    }

    const birthdayUsers = [];
    for (const [userId, birthday] of Object.entries(data.birthdays)) {
        if (birthday === todayStr) {
            birthdayUsers.push(userId);
        }
    }

    if (birthdayUsers.length > 0) {
        try {
            const channel = await client.channels.fetch(config.birthdayChannelId);
            if (channel) {
                for (const userId of birthdayUsers) {
                    const embed = new EmbedBuilder()
                        .setTitle('🎊 生日快樂！ Happy Birthday! 🎊')
                        .setDescription(`讓我們一起祝 <@${userId}> 生日快樂！✨\n在這個特別的日子裡，願你所有的夢想都能實現，每天都充滿快樂與幸福！`)
                        .setColor('#FF69B4') // 粉紅色
                        .setThumbnail('https://i.imgur.com/6U4MToC.png') // 示意蛋糕圖，或可用其他裝飾
                        .addFields(
                            { name: '🎂 壽星', value: `<@${userId}>`, inline: true },
                            { name: '📅 日期', value: todayStr, inline: true }
                        )
                        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJmZzVxYm81ZzNnZzRneGZ6YmJ6ZzRneGZ6YmJ6ZzRneGZ6YmJ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/K7I7f4b8oV0hG/giphy.gif') // 派對 GIF
                        .setFooter({ text: 'Jellyfish 祝賀系統', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();

                    await channel.send({ content: `🎉 嘿大家！今天是 <@${userId}> 的生日！`, embeds: [embed] });
                }
                console.log(`🎉 已為 ${birthdayUsers.length} 位成員送出生日祝賀！`);
            }
        } catch (err) {
            console.error('❌ 發送生日祝賀時發生錯誤:', err);
        }
    }

    data.lastBirthdayCheck = dateKey;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ==========================================
// 【功能函數：任務提醒檢查】
// ==========================================
async function checkReminders() {
    console.log('⏰ 正在檢查任務提醒...');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.reminderChannelId) {
        console.log('⚠️ 提醒功能未啟動：尚未設定提醒頻道 (請使用 /reminder_channel)。');
        return;
    }

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];

    const messages = [
        "✨ 嘿！{user}，時間到啦！快去把任務解決掉，你是最棒的！🚀",
        "🌟 提醒時間！{user}，該去解任務囉，加油！💪",
        "📢 呼叫 {user}！任務時間到了，動起來動起來！🔥",
        "🌈 {user}，任務在等著你呢！完成它就可以好好放鬆啦～✨",
        "🦊 滴滴滴！{user}，解任務的小雷達響了，快去看看吧！⚡"
    ];

    let updated = false;
    for (const reminder of data.reminders) {
        const remTime = new Date(now);
        remTime.setHours(reminder.hour, reminder.minute, 0, 0);
        
        // 判斷是否大於或等於設定時間，且今天尚未發送
        if (now >= remTime && reminder.lastSentDate !== todayDate) {
            try {
                const channel = await client.channels.fetch(config.reminderChannelId);
                if (channel) {
                    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
                    await channel.send({ content: randomMsg.replace('{user}', `<@${reminder.userId}>`) });
                    reminder.lastSentDate = todayDate;
                    updated = true;
                    console.log(`✅ 已發送任務提醒給 <@${reminder.userId}>`);
                }
            } catch (err) {
                console.error(`❌ 發送提醒給 ${reminder.userId} 時發生錯誤:`, err);
            }
        }
    }

    if (updated) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    }
    console.log('✅ 任務提醒檢查完畢。');
}

function getCurrentOnlineCount(guild) {
    // 篩選出狀態不是 offline (離線) 的成員
    return guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline' && !m.user.bot).size;
}

// ==========================================
// 【2. 註冊 ready 事件】
// ==========================================
client.once('ready', async () => {
    console.log(`✅ 機器人已上線！名稱: ${client.user.tag}`);
    
    // 1. 註冊斜線指令
    try {
        console.log('🔄 正在註冊 (/) 斜線指令...');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ (/) 斜線指令註冊成功！共註冊了 ${commands.length} 個指令。`);
        console.log('註冊清單:', commands.map(c => c.name).join(', '));
    } catch (error) {
        console.error('❌ 註冊斜線指令錯誤:', error);
    }

    // 2. 啟動定時任務 (優先啟動)
    console.log('🚀 正在啟動定時任務系統...');
    
    // 生日檢查：立即執行一次，之後每 6 小時檢查一次
    checkBirthdays();
    setInterval(checkBirthdays, 6 * 60 * 60 * 1000); 

    // 任務提醒：立即執行一次，之後每 30 分鐘檢查一次
    checkReminders();
    setInterval(checkReminders, 30 * 60 * 1000); 

    // 3. 在線人數掃描：立即掃描一次，之後每 30 分鐘更新一次
    const scanGuilds = async () => {
        console.log('🔍 正在執行在線人數掃描與更新...');
        for (const [id, guild] of client.guilds.cache) {
            try {
                await guild.members.fetch(); 
                const count = getCurrentOnlineCount(guild);
                console.log(`📊 伺服器 [${guild.name}] 當前在線人數: ${count}`);
                await updateCounts(guild, count);
            } catch (err) {
                console.error(`無法獲取伺服器 ${guild.name} 的成員列表:`, err);
            }
        }
        console.log('✅ 掃描與更新完成。');
    };
    
    scanGuilds(); 
    setInterval(scanGuilds, 30 * 60 * 1000); // 設定為每 30 分鐘更新一次
});

// ==========================================
// 【3. 追蹤在線狀態變化】
// ==========================================
/* 已改為定時輪詢，停用實時監控以節省效能
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.guild) return;
    
    const guild = newPresence.guild;
    const count = getCurrentOnlineCount(guild);
    await updateCounts(guild, count);
});
*/

// ==========================================
// 【4. 處理指令互動】
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 記錄指令互動日誌
    console.log(`[Interaction] ${interaction.user.tag} 使用了指令: /${interaction.commandName}`);

    try {
        if (interaction.commandName === decreeCommand.name) {
            return await executeDecree(interaction);
        }

    if (interaction.commandName === 'peak') {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const timeStr = data.peakTimestamp ? new Date(data.peakTimestamp).toLocaleString('zh-TW') : '尚無紀錄';
        
        await interaction.reply({
            content: `🏆 **最高同時在線人數紀錄** 🏆\n\n👤 最高人數：**${data.peakCount}** 人\n⏰ 達成時間：\`${timeStr}\`\n\n*(統計不包含機器人)*`
        });
    }

    if (interaction.commandName === 'setchannel') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.voiceChannelId = channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({ content: `✅ 成功！已設定最高人數顯示頻道為: **${channel.name}**\n機器人現在會自動更新該頻道的名稱來顯示最高人數。`, ephemeral: true });
        
        const count = getCurrentOnlineCount(interaction.guild);
        await updateCounts(interaction.guild, count);
    }

    if (interaction.commandName === 'setcurrent') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.currentCountChannelId = channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({ content: `✅ 成功！已設定當前人數顯示頻道為: **${channel.name}**\n機器人現在會自動更新該頻道的名稱來顯示當前人數。`, ephemeral: true });
        
        const count = getCurrentOnlineCount(interaction.guild);
        await updateCounts(interaction.guild, count);
    }

    if (interaction.commandName === 'online') {
        const count = getCurrentOnlineCount(interaction.guild);
        await interaction.reply({
            content: `📊 **當前在線人數統計** 📊\n\n👤 目前人數：**${count}** 人\n\n*(統計不包含機器人)*`
        });
    }

    if (interaction.commandName === 'setbirthday') {
        const month = interaction.options.getInteger('month');
        const day = interaction.options.getInteger('day');
        const birthdayStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        data.birthdays[interaction.user.id] = birthdayStr;
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        await interaction.reply({ content: `🎂 成功！已將您的生日設定為 **${month}月${day}日**。機器人屆時會為您慶祝！`, ephemeral: true });
    }

    if (interaction.commandName === 'birthday_channel') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.birthdayChannelId = channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({ content: `✅ 成功！已設定生日祝賀頻道為: **${channel.name}**。`, ephemeral: true });
    }

    if (interaction.commandName === 'admin_setbirthday') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const month = interaction.options.getInteger('month');
        const day = interaction.options.getInteger('day');
        const birthdayStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        data.birthdays[targetUser.id] = birthdayStr;
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        await interaction.reply({ content: `🎂 成功！已將 <@${targetUser.id}> 的生日設定為 **${month}月${day}日**。`, ephemeral: true });
    }

    if (interaction.commandName === 'birthday_countdown') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const birthday = data.birthdays[targetUser.id];

        if (!birthday) {
            return interaction.reply({ content: `❌ 尚未紀錄 <@${targetUser.id}> 的生日。`, ephemeral: true });
        }

        const [month, day] = birthday.split('-').map(Number);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let message = `⏳ 距離 <@${targetUser.id}> 的下次生日 (**${month}/${day}**) `;
        if (diffDays === 0) {
            message += `就是 **今天**！🎂`;
        } else {
            message += `還有 **${diffDays}** 天！`;
        }

        await interaction.reply({ content: message });
    }

    if (interaction.commandName === 'set_reminder') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const hour = interaction.options.getInteger('hour');
        const minute = interaction.options.getInteger('minute');

        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 檢查是否已存在，有的話就更新
        const existingIdx = data.reminders.findIndex(r => r.userId === targetUser.id);
        if (existingIdx !== -1) {
            data.reminders[existingIdx].hour = hour;
            data.reminders[existingIdx].minute = minute;
            data.reminders[existingIdx].lastSentDate = null; // 重設發送狀態
        } else {
            data.reminders.push({
                userId: targetUser.id,
                hour: hour,
                minute: minute,
                lastSentDate: null
            });
        }
        
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `✅ 成功！已設定 <@${targetUser.id}> 的每日提醒時間為 **${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}**。`, ephemeral: true });
    }

    if (interaction.commandName === 'remove_reminder') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        const initialLen = data.reminders.length;
        data.reminders = data.reminders.filter(r => r.userId !== targetUser.id);
        
        if (data.reminders.length === initialLen) {
            return interaction.reply({ content: `❌ 找不到 <@${targetUser.id}> 的提醒設定。`, ephemeral: true });
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        await interaction.reply({ content: `✅ 已成功移除 <@${targetUser.id}> 的任務提醒。`, ephemeral: true });
    }

    if (interaction.commandName === 'list_reminders') {
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        if (data.reminders.length === 0) {
            return interaction.reply({ content: '📅 目前沒有設定任何任務提醒。' });
        }

        let listMsg = '📅 **目前的任務提醒清單** 📅\n\n';
        data.reminders.forEach(r => {
            listMsg += `• <@${r.userId}> - \`${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}\`\n`;
        });

        await interaction.reply({ content: listMsg });
    }

    if (interaction.commandName === 'reminder_channel') {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ 只有管理員可以使用此指令。', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.reminderChannelId = channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({ content: `✅ 成功！已設定任務提醒頻道為: **${channel.name}**。`, ephemeral: true });
        } else {
            console.warn(`[Interaction] 未知的指令: /${interaction.commandName}`);
            await interaction.reply({ content: `❌ 未知指令: \`${interaction.commandName}\``, ephemeral: true });
        }
    } catch (error) {
        console.error(`❌ 處理指令 [${interaction.commandName}] 時發生錯誤:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '抱歉，處理指令時發生錯誤！', ephemeral: true });
        } else {
            await interaction.reply({ content: '抱歉，處理指令時發生錯誤！', ephemeral: true });
        }
    }
});

// 全域錯誤處理
process.on('unhandledRejection', error => {
    console.error('❌ 未處理的 Promise 拒絕:', error);
});

client.on('error', error => {
    console.error('❌ Discord 客戶端錯誤:', error);
});

client.login(process.env.DISCORD_TOKEN);
