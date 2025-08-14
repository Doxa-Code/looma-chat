import { sseEmitter } from "@/lib/sse";
import { securityProcedure } from "./procedure";

export const sse = securityProcedure([
  "view:conversation",
  "view:conversations",
]).handler(async ({ request }) => {
  const encoder = new TextEncoder();

  let isOpen = true;

  const stream = new ReadableStream({
    cancel() {
      isOpen = false;
    },
    async start(controller) {
      const sendEvent = (data: any) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          isOpen = false;
          console.log("Stream fechada, não é possível enviar mais eventos.");
          try {
            controller.close();
          } catch {}
        }
      };

      sendEvent({ type: "connected" });

      const keepAlive = setInterval(() => {
        sendEvent({ type: "ping" });
      }, 1000);

      const onMessage = (data: any) => {
        sendEvent({
          type: "message",
          data,
        });
      };

      sseEmitter.on("message", onMessage);
      sseEmitter.on("typing", () => sendEvent({ type: "typing" }));
      sseEmitter.on("untyping", () => sendEvent({ type: "untyping" }));

      request?.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        sseEmitter.removeListener("message", onMessage);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
