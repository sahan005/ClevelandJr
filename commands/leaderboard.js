const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dbHelper = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the word usage leaderboard')
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('The timeframe for the leaderboard')
        .setRequired(false)
        .addChoices(
          { name: 'Monthly', value: 'monthly' },
          { name: 'All-Time', value: 'alltime' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Check a specific user instead of the top leaderboard')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();
    const timeframe = interaction.options.getString('timeframe') || 'monthly';
    const targetUser = interaction.options.getUser('user');

    // Current month-year string, e.g. "2026-07"
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Specific user check
    if (targetUser) {
      if (timeframe === 'monthly') {
        const count = dbHelper.getUserMonthlyCount(interaction.guildId, targetUser.id, currentMonthYear);
        return interaction.editReply(`**${targetUser.username}** used the n-word **${count}** times this month. Great job keep going blud`);
      } else {
        const count = dbHelper.getUserTotalCount(interaction.guildId, targetUser.id);
        return interaction.editReply(`**${targetUser.username}** used the n-word **${count}** times all-time. Excellent work my n!gga`);
      }
    }

    // Leaderboard logic
    let leaderboardData;
    let title;

    if (timeframe === 'monthly') {
      leaderboardData = dbHelper.getMonthlyLeaderboard(interaction.guildId, currentMonthYear, 3);
      title = `🏆 Monthly Leaderboard (${currentMonthYear})`;
    } else {
      leaderboardData = dbHelper.getAllTimeLeaderboard(interaction.guildId, 3);
      title = '🏆 All-Time Leaderboard';
    }

    if (leaderboardData.length === 0) {
      return interaction.editReply('No data to show for this leaderboard yet!');
    }

    let description = '';
    for (let i = 0; i < leaderboardData.length; i++) {
      const row = leaderboardData[i];
      const count = row.count !== undefined ? row.count : row.total_count;
      description += `**${i + 1}.** <@${row.user_id}> - ${count} uses\n`;
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
