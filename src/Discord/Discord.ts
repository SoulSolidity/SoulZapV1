import { WebhookClient } from 'discord.js';

export async function sendMessage() {
    const id = process.env.DISCORD_WEBHOOK_ID!;
    const token = process.env.DISCORD_WEBHOOK_TOKEN!;
    const webhook = new WebhookClient({ id, token });

    webhook.send({
        content: 'Webhook test',
    });
}