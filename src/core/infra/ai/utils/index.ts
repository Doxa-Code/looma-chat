import { memoryWithVector } from "../config/memories";

type Props = {
  threadId?: string;
  resourceId?: string;
  content: string | object;
};

export const saveMessageOnThread = async (props: Props) => {
  const thread = await memoryWithVector.getThreadById({
    threadId: props.threadId!,
  });

  if (!thread) {
    await memoryWithVector.createThread({
      resourceId: props.resourceId!,
      saveThread: true,
      threadId: props.threadId,
    });
  }
  await memoryWithVector.saveMessages({
    messages: [
      {
        id: crypto.randomUUID().toString(),
        content:
          typeof props.content === "string"
            ? props.content
            : JSON.stringify(props.content, null, 2),
        role: "tool",
        createdAt: new Date(),
        type: "tool-result",
        threadId: props.threadId,
        resourceId: props.resourceId,
      },
    ],
  });
};
