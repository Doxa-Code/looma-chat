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
          accessKey: process.env.AWS_ACCESS_KEY_ID,
          region: process.env.AWS_DEFAULT_REGION,
          secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
    };
  },
  async run() {
    const queue = new sst.aws.Queue("LoomaBroker", {
      fifo: true,
    });

    queue.subscribe("functions/looma-broker.handler");

    return {
      queue: queue.url,
    };
  },
});
