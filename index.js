require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const dbHelper = require('./database');

// Initialize database
dbHelper.initDatabase();

// Create a new client instance
// We need MessageContent intent to read what users say
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Handle Slash Commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    } catch (fallbackError) {
      console.error('Failed to send error message:', fallbackError);
    }
  }
});

// Handle Message Counting
client.on(Events.MessageCreate, message => {
  // Ignore bots to prevent infinite loops
  if (message.author.bot) return;
  
  // Ignore Direct Messages
  if (!message.guild) return;

  const content = message.content.toLowerCase();
  
  // Get tracked words from json file
  let trackedWords = [];
  try {
    const wordsData = fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8');
    trackedWords = JSON.parse(wordsData).map(w => w.toLowerCase());
  } catch (err) {
    console.error("Error reading words.json", err);
    return;
  }
  
  if (trackedWords.length === 0) return;

  let countInMessage = 0;

  // Simple word matching. This splits by non-word characters to avoid matching substrings
  // e.g. "assassin" shouldn't trigger "ass"
  const wordsInMessage = content.match(/\b(\w+)\b/g);
  
  if (!wordsInMessage) return;

  for (const word of wordsInMessage) {
    if (trackedWords.includes(word)) {
      countInMessage++;
    }
  }

  if (countInMessage > 0) {
    // Current month-year string, e.g. "2026-07"
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Increment the count in the database
    dbHelper.incrementUserCount(message.guild.id, message.author.id, monthYear, countInMessage);
  }
});

// Log in to Discord with your client's token
if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is missing in .env file!");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
