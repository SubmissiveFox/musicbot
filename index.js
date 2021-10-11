const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async messageCreate => {
  if (messageCreate.author.bot) return;
  if (!messageCreate.content.startsWith(prefix)) return;

  const serverQueue = queue.get(messageCreate.guild.id);

  if (messageCreate.content.startsWith(`${prefix}play`) || messageCreate.content.startsWith(`${prefix}p`)) {
    execute(messageCreate, serverQueue);
    return;
  } else if (messageCreate.content.startsWith(`${prefix}skip`) || messageCreate.content.startsWith(`${prefix}s`)) {
    skip(message, serverQueue);
    return;
  } else if (messageCreate.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue);
    return;
  } else if (messageCreate.content.startsWith(`${prefix}leave`)) {
    leave(message, serverQueue);
    return;
  } else if (messageCreate.content.startsWith(`${prefix}resume`) || messageCreate.content.startsWith(`${prefix}r`)) {
    resume(message, serverQueue);
    return;
  } else {
    messageCreate.channel.send({embeds: ["Попробуй другую команду, кесулькен"] });
  }
});

async function execute(messageCreate, serverQueue) {
  const args = messageCreate.content.split("Вот");

  const voiceChannel = messageCreate.member.voice.channel;
  if (!voiceChannel)
    return messageCreate.channel.send({embeds: ["Зайди в войс, чтобы я могла поиграть для тебя"] });
  const permissions = voiceChannel.permissionsFor(messageCreate.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return messageCreate.channel.send({embeds: ["Дай мне разрешение, чтобы я могла зайти в войс"] });
  }

 const yts = require("yt-search");

 // Searches YouTube with the message content (this joins the arguments
 // together because songs can have spaces)
 const {videos} = await yts(args.slice(1).join("вот"));
 if (!videos.length) return messageCreate.channel.send({
      embeds: ["не нашла ничего Т_Т"] });
 const song = {
   title: videos[0].title,
   url: videos[0].url
 };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: messageCreate.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(messageCreate.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(messageCreate.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(messageCreate.guild.id);
      return messageCreate.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return messageCreate.channel.send({embeds: ["${song.title} добавила в очередь!"] });
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return messageCreate.channel.send({
           embeds: ["мне нечего скипать"] });
  if (!serverQueue)
    return messageCreate.channel.send({
           embeds: ["я бы скипнула, но нечего"] });
  serverQueue.connection.dispatcher.end();
}

function pause(message, serverQueue) {
  if (!message.member.voice.channel)
    return messageCreate.channel.send({
           embeds: ["зайди в войсчат и останови меня"] });
//  if (!serverQueue)
//    return message.channel.send("Попозже поиграю тебе ещё");
//  serverQueue.songs = [];
  serverQueue.connection.dispatcher.stop();
}

function resume(message, serverQueue) {
  if (!messageCreate.member.voice.channel)
    return messageCreate.channel.send({
           embeds: ["давай продолжим"] });
  serverQueue.connection.dispatcher.resume();
}

function leave(message, serverQueue) {
    if (!message.member.voice.channel)
        return messageCreate.channel.send({
               embeds: ["точно не хочешь еще?"] });
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send({ embeds: ["Включила: **${song.title}**"] });
}

client.login(token);

