import { Client, StreamDispatcher, VoiceChannel, VoiceConnection } from "discord.js";
import { CONFIG } from "./config";
import * as pogger from "pogger";

const client = new Client();
let dispatcher: StreamDispatcher;

client.on("ready", async () => {
    await client.user?.setPresence({
        activity: {
            name: "Made with ❤ by Muratva Stark",
            type: "WATCHING"
        }
    });
    await (client.channels.cache.get(CONFIG.VOICE_CHANNEL) as VoiceChannel).join();
    pogger.info(`${client.user?.username} is online.`);
});


client.on("voiceStateUpdate", async (oldState, newState) => {
    if (
        !newState.channelID &&
        newState.id === client.user?.id &&
        dispatcher
    ) {
        dispatcher.destroy();
        return;
    }


    if (!oldState.channelID && newState.channelID) {
        if (
            newState.id === client.user?.id ||
            newState.channelID !== CONFIG.VOICE_CHANNEL
        ) return;
        const channel = client.channels.cache.get(CONFIG.VOICE_CHANNEL) as VoiceChannel;
        if (!channel) return;
        const isAdmin = CONFIG.ADMIN_ROLES.some((roleID) => newState.member?.roles.cache.has(roleID)); 
        let connection: VoiceConnection;
        if (newState.connection) connection = newState.connection;
        else connection = await channel.join();
        const membersSize = channel.members.filter(member => !member.user.bot && !CONFIG.ADMIN_ROLES.some(roleID => member.roles.cache.has(roleID))).size as number;
        const adminsSize = channel.members.filter(member => !member.user.bot && CONFIG.ADMIN_ROLES.some(roleID => member.roles.cache.has(roleID))).size as number;
               
        if (
            dispatcher && 
            !dispatcher.destroyed
        ) {
            if (!isAdmin) return;
            else {
                if (membersSize > 0) return createDispatcher(connection, "staff", false);
                else return dispatcher.destroy();
            }
        }
        if (!isAdmin) {
            if (adminsSize > 0) createDispatcher(connection, "staff", false);
            else createDispatcher(connection, "welcome", true);
        }
        else if (membersSize > 0) createDispatcher(connection, "staff", false);
    }


    if (
        oldState.channelID && 
        !newState.channelID
    ) {
        const membersSize = oldState.channel?.members?.filter(member => !member.user.bot && !CONFIG.ADMIN_ROLES.some(roleID => member.roles.cache.has(roleID))).size as number;
        const adminsSize = oldState.channel?.members?.filter(member => !member.user.bot && CONFIG.ADMIN_ROLES.some(roleID => member.roles.cache.has(roleID))).size as number;

        if (
            newState.id === client.user?.id ||
            oldState.channelID !== CONFIG.VOICE_CHANNEL ||
            !dispatcher
        ) return;

        if (membersSize < 1) dispatcher.destroy();
        else {
            if (adminsSize < 1) {
                dispatcher.destroy();
                const channel = client.channels.cache.get(CONFIG.VOICE_CHANNEL) as VoiceChannel;
                if (!channel) return; 
                let connection: VoiceConnection;
                if (oldState.connection) connection = oldState.connection;
                else connection = await channel.join();
                createDispatcher(connection, "welcome", true);
            }
        }

    }
});


function createDispatcher(
    connection: VoiceConnection,
    file: "welcome" | "staff",
    loop: boolean
) {
    if (dispatcher) dispatcher.destroy();
    dispatcher = connection.play(`./${file}.mp3`);
    dispatcher.on("finish", () => {
        if (loop) createDispatcher(connection, file, loop);
        else dispatcher.destroy();
    });
}

client.login(CONFIG.TOKEN);
