const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listwords')
    .setDescription('List all currently tracked words'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    let trackedWords = [];
    try {
      const wordsData = fs.readFileSync(path.join(__dirname, '..', 'words.json'), 'utf8');
      trackedWords = JSON.parse(wordsData);
    } catch (err) {
      return interaction.editReply({ content: 'Error reading the dictionary file.' });
    }
    
    if (trackedWords.length === 0) {
      return interaction.editReply({ content: 'There are currently no words being tracked. Please update `words.json`.' });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Tracked Words')
      .setDescription(`Currently tracking ${trackedWords.length} words:\n\n${trackedWords.map(w => `- **${w}**`).join('\n')}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
