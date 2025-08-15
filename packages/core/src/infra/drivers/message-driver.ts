import axios from "axios";
import FormData from "form-data";

type SendMessageTextProps = {
  channel: string;
  to: string;
  content: string;
};

type TypingProps = {
  lastMessageId: string;
  channel: string;
};

type SendMessageAudioProps = {
  channel: string;
  to: string;
  file: File;
};

interface MessageDriver {
  sendMessageText(data: SendMessageTextProps): Promise<string>;
  sendMessageAudio(data: SendMessageAudioProps): Promise<{
    id: string;
    mediaId: string;
  }>;
  sendTyping(data: TypingProps): Promise<void>;
  downloadMedia(
    channel: string,
    mediaId: string
  ): Promise<
    { success: true; content: ArrayBuffer } | { success: false; content: Error }
  >;
  listPhonesId(wabaId: string): Promise<{ id: string; phone: string }[]>;
}

export class MetaMessageDriver implements MessageDriver {
  private client = axios.create({
    baseURL: "https://graph.facebook.com/v23.0",
    headers: {
      Authorization: `Bearer ${process.env.META_TOKEN}`,
    },
  });

  async listPhonesId(wabaId: string): Promise<{ id: string; phone: string }[]> {
    try {
      const response = await this.client.get(`/${wabaId}/phone_numbers`);
      return response.data.data.map((p: any) => ({
        id: p.id,
        phone: `${p.display_phone_number} - ${p.verified_name}`,
      }));
    } catch {
      return [];
    }
  }

  async downloadMedia(
    channel: string,
    mediaId: string
  ): Promise<
    { success: true; content: ArrayBuffer } | { success: false; content: Error }
  > {
    try {
      const mediaRetrieved = await this.client.get<{ url: string }>(
        `/${mediaId}?phone_number_id=${channel}`
      );
      const result = await axios.get(mediaRetrieved.data.url, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${process.env.META_TOKEN}` },
      });

      return { success: true, content: result.data };
    } catch (err) {
      return { success: false, content: err as Error };
    }
  }

  async sendTyping(data: TypingProps): Promise<void> {
    await this.client
      .post(`/${data.channel}/messages`, {
        messaging_product: "whatsapp",
        status: "read",
        message_id: data.lastMessageId,
        typing_indicator: {
          type: "text",
        },
      })
      .catch((err) => console.log(JSON.stringify(err, null, 2)));
  }

  async sendMessageText(data: SendMessageTextProps): Promise<string> {
    const response = await this.client.post<{
      messages: {
        id: string;
      }[];
    }>(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "text",
      text: {
        preview_url: false,
        body: data.content,
      },
    });

    return response?.data?.messages?.[0]?.id ?? "";
  }

  async sendMessageAudio(data: SendMessageAudioProps): Promise<{
    id: string;
    mediaId: string;
  }> {
    const arrayBuffer = await data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const form = new FormData();
    form.append("file", buffer, {
      filename: data.file.name,
      contentType: data.file?.type || "audio/ogg",
    });

    form.append("messaging_product", "whatsapp");

    const uploadResponse = await this.client.post<{ id: string }>(
      `/${data.channel}/media`,
      form,
      {
        headers: form.getHeaders(),
      }
    );

    const mediaId = uploadResponse.data.id;

    const sendResponse = await this.client.post<{
      messages: {
        id: string;
      }[];
    }>(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "audio",
      audio: { id: mediaId },
    });

    return {
      id: sendResponse?.data?.messages?.[0]?.id ?? "",
      mediaId,
    };
  }

  static instance() {
    return new MetaMessageDriver();
  }
}
