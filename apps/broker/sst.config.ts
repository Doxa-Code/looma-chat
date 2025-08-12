/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "looma-broker",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: "loomaai",
        },
      },
    };
  },
  async run() {
    const queue = new sst.aws.Queue("LoomaBroker", {
      fifo: true,
    });

    queue.subscribe("src/looma-broker.handler");

    return {
      queue: queue.url,
    };
  },
});
