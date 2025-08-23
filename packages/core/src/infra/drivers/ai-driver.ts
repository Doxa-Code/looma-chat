import { Cart } from "../../domain/entities/cart";
import { User } from "../../domain/entities/user";
import { Contact } from "../../domain/value-objects/contact";
import { RuntimeContext } from "@mastra/core/runtime-context";
import axios from "axios";
import FormData from "form-data";
import { setTimeout } from "node:timers/promises";
import { mastra as ai } from "../ai";
import { azure } from "../ai/config/llms/azure";
import { Setting } from "../../domain/value-objects/setting";
import { Span, trace } from "@opentelemetry/api";
import { SemanticConventions } from "@arizeai/openinference-semantic-conventions";
import { context } from "@opentelemetry/api";
import { setSession } from "@arizeai/openinference-core";
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
    const tracer = trace.getTracer("agent");

    return tracer.startActiveSpan("agent", async (span: Span) => {
      span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, "agent");
      span.setAttribute(SemanticConventions.SESSION_ID, props.conversationId);
      span.setAttribute(SemanticConventions.INPUT_VALUE, props.content);
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

        return context.with(
          setSession(context.active(), { sessionId: props.conversationId }),
          async () => {
            const response = await looma.generate(props.content, {
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
            });

            const result = response.text;
            span.setAttribute(SemanticConventions.OUTPUT_VALUE, result);
            span.setAttribute(
              SemanticConventions.LLM_TOKEN_COUNT_COMPLETION,
              (response?.response?.body as any)?.usage?.completion_tokens
            );
            span.setAttribute(
              SemanticConventions.LLM_TOKEN_COUNT_COMPLETION_DETAILS,
              JSON.stringify(
                (response?.response?.body as any)?.usage
                  ?.completion_tokens_details
              )
            );
            span.setAttribute(
              SemanticConventions.LLM_TOKEN_COUNT_PROMPT,
              (response?.response?.body as any)?.usage?.prompt_tokens
            );
            span.setAttribute(
              SemanticConventions.LLM_TOKEN_COUNT_PROMPT_DETAILS,
              JSON.stringify(
                (response?.response?.body as any)?.usage?.prompt_tokens_details
              )
            );
            span.setAttribute(
              SemanticConventions.LLM_TOKEN_COUNT_TOTAL,
              (response?.response?.body as any)?.usage?.total_tokens
            );
            span.setAttribute(
              SemanticConventions.LLM_MODEL_NAME,
              response?.response?.modelId
            );
            response.toolCalls.map((t: any) => {
              span.setAttribute(
                SemanticConventions.TOOL_CALL_FUNCTION_ARGUMENTS_JSON,
                JSON.stringify(t.args)
              );
              span.setAttribute(
                SemanticConventions.TOOL_CALL_FUNCTION_NAME,
                t.toolName
              );
              span.setAttribute(SemanticConventions.TOOL_CALL_ID, t.toolCallId);
            });
            response.response.messages.map((m: any) => {
              span.setAttribute(
                SemanticConventions.MESSAGE_CONTENT,
                JSON.stringify(m.content)
              );
              span.setAttribute(SemanticConventions.MESSAGE_ROLE, m.role);
            });
            span.end();
            return result;
          }
        );
      } catch (err: any) {
        span.recordException(err);
        span.end();

        console.log(err);
        if (retry > 2) {
          return "";
        }
        return await this.sendMessage(props, retry + 1);
      }
    });
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
