// app/lib/utils.ts
import Pusher from "pusher";

export async function triggerPusher(channel: string, event: string, data: any) {
  try {
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });

    await pusher.trigger(channel, event, data);
  } catch (err) {
    console.warn("Pusher trigger failed:", err);
  }
}
