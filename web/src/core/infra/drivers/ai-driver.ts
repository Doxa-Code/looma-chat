import { Cart } from "@/core/domain/entities/cart";
import { User } from "@/core/domain/entities/user";
import { Contact } from "@/core/domain/value-objects/contact";
import { RuntimeContext } from "@mastra/core/runtime-context";
import axios from "axios";
import FormData from "form-data";
import { setTimeout } from "node:timers/promises";
import { mastra as ai } from "../ai";
import { azure } from "../ai/config/llms/azure";
import { Setting } from "@/core/domain/value-objects/setting";
import { Span, trace } from "@opentelemetry/api";
import { SemanticConventions } from "@arizeai/openinference-semantic-conventions";
import { context } from "@opentelemetry/api";
import { setSession } from "@arizeai/openinference-core";

type SendMessageProps = {
  aiUser: User;
  workspaceId: string;
  lastCart: Cart | null;
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
    const tracer = trace.getTracer("agent");

    return tracer.startActiveSpan("agent", async (span: Span) => {
      span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, "agent");
      span.setAttribute(SemanticConventions.SESSION_ID, props.conversationId);
      span.setAttribute(SemanticConventions.INPUT_VALUE, props.content);
      try {
        const runtimeContext = new RuntimeContext([
          ["contactName", props.contact.name],
          ["contactPhone", props.contact.phone],
          ["conversationId", props.conversationId],
          ["userId", props.aiUser.id],
          ["workspaceId", props.workspaceId],
          ["settings", props.settings],
          [
            "databaseConfig",
            {
              pinecone: {
                namespace: props.settings.vectorNamespace,
              },
            },
          ],
        ]);
        return context.with(
          setSession(context.active(), { sessionId: props.conversationId }),
          async () => {
            const response = await looma.generate(props.content, {
              runtimeContext,
              maxSteps: 999,
              memory: {
                resource: props.contact.phone,
                thread: {
                  id: props.conversationId,
                  resourceId: props.contact.phone,
                },
              },
              telemetry: {
                isEnabled: true,
                recordInputs: true,
                recordOutputs: true,
              },
            });

            const result = response.text;
            span.setAttribute(SemanticConventions.OUTPUT_VALUE, result);
            span.end();
            return result;
          }
        );
      } catch (err: any) {
        span.recordException(err);
        if (retry > 2) {
          return "";
        }
        return await this.sendMessage(props, retry + 1);
      }
    });
  }

  async transcriptAudio(props: TranscriptAudioProps): Promise<string> {
    try {
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
    } catch (err) {
      console.log(err);
      return "";
    }
  }

  async analyzerImage(props: AnalyzerImageProps): Promise<string> {
    try {
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
    } catch (err) {
      console.log(err);
      return "";
    }
  }

  static instance() {
    return new LoomaAIDriver();
  }
}
