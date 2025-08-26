import { RuntimeContext } from "@mastra/core/runtime-context";
import axios from "axios";
import FormData from "form-data";
import { setTimeout } from "node:timers/promises";
import { Cart } from "../../domain/entities/cart";
import { User } from "../../domain/entities/user";
import { Contact } from "../../domain/value-objects/contact";
import { Setting } from "../../domain/value-objects/setting";
import { mastra as ai } from "../ai";
import { azure } from "../ai/config/llms/azure";
import { Context } from "../ai/config/prompts";

type SendMessageProps = {
  aiUser: User;
  workspaceId: string;
  lastCart: Cart | null;
  currentCart: Cart | null;
  contact: Contact;
  conversationId: string;
  content: string;
  settings: Setting;
};

type TranscriptAudioProps = {
  audio: ArrayBuffer;
};

type AnalyzerImageProps = {
  image: ArrayBuffer;
};

interface AIDriver {
  sendMessage(props: SendMessageProps): Promise<string>;
  transcriptAudio(props: TranscriptAudioProps): Promise<string>;
  analyzerImage(props: AnalyzerImageProps): Promise<string>;
}

export class LoomaAIDriver implements AIDriver {
  async sendMessage(props: SendMessageProps, retry = 0): Promise<string> {
    const looma = ai.getAgent("loomaAgent");
    try {
      const threadId = [props.workspaceId, props.contact.phone].join("-");
      const runtimeContext = new RuntimeContext<Context>([
        ["contactName", props.contact.name],
        ["lastCart", props.lastCart],
        ["currentCart", props.currentCart],
        ["contactPhone", props.contact.phone],
        ["conversationId", props.conversationId],
        ["userId", props.aiUser.id],
        ["userName", props.aiUser.name],
        ["workspaceId", props.workspaceId],
        ["settings", props.settings],
        [
          "agentOptions",
          {
            memory: {
              resource: threadId,
              thread: {
                id: threadId,
                resourceId: threadId,
              },
            },
            telemetry: {
              isEnabled: true,
              recordInputs: true,
              recordOutputs: true,
            },
          },
        ],
      ]);

      const response = looma.streamVNext(props.content, {
        memory: {
          resource: threadId,
          thread: {
            id: threadId,
            resourceId: threadId,
          },
        },
        telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
        runtimeContext,
        maxSteps: 10,
        temperature: 0.5,
        topP: 0.7,
      });

      const result = await response.text;
      return result;
    } catch (err: any) {
      console.log(err);
      if (retry > 8) {
        return "";
      }
      await setTimeout(1000);
      return await this.sendMessage(props, retry + 1);
    }
  }

  async transcriptAudio(props: TranscriptAudioProps): Promise<string> {
    const form = new FormData();
    form.append("file", Buffer.from(props.audio), {
      filename: "audio.ogg",
      contentType: "audio/ogg",
    });
    form.append("language", "pt");

    const response = await axios.post(
      `${process.env.AZURE_VOICE_ENDPOINT}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.AZURE_MEDIA_API_KEY}`,
        },
      }
    );

    const transcript = response.data;

    await setTimeout(1000);

    return transcript.text;
  }

  async analyzerImage(props: AnalyzerImageProps): Promise<string> {
    const response = await azure("gpt-4.1").doGenerate({
      mode: { type: "regular" },
      prompt: [
        {
          role: "system",
          content:
            "Você receberá uma imagem de uma receita médica o seu objetivo é transcrever todas as informações descritas nelas para auxiliar um atendente de farmácia a atendenter o cliente.",
        },
        {
          role: "user",
          content: [
            {
              image: new Uint8Array(props.image),
              type: "image",
              mimeType: "image/jpeg",
            },
          ],
        },
      ],
      inputFormat: "prompt",
    });

    await setTimeout(1000);
    return `
        O cliente enviou uma imagem e contém:
        ${response.text} 
      `;
  }

  static instance() {
    return new LoomaAIDriver();
  }
}
