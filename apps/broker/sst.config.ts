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
          region: process.env.AWS_DEFAULT_REGION as any,
          secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
    };
  },
  async run() {
    const productsQueue = new sst.aws.Queue("ProductsBroker", {
      fifo: true,
    });

    productsQueue.subscribe({
      handler: "functions/products-broker.handler",
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    });

    const clientsQueue = new sst.aws.Queue("ClientsBroker", {
      fifo: true,
    });

    clientsQueue.subscribe({
      handler: "functions/clients-broker.handler",
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    });

    const upsertCart = new sst.aws.Queue("UpsertCart", {
      fifo: true,
    });

    const finishCart = new sst.aws.Queue("FinishCart", {
      fifo: true,
    });

    finishCart.subscribe({
      handler: "functions/finish-cart.handler",
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    });

    return {
      productsQueue: productsQueue.url,
      clientsQueue: clientsQueue.url,
      upsertCart: upsertCart.url,
      finishCart: finishCart.url,
    };
  },
});
