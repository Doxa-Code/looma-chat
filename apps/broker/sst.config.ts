/// <reference path="./.sst/platform/config.d.ts" />

const cartQueues = [
  "c2d27d7a-1c04-451b-b7f9-548f2faf3bd3",
  "c7c919ea-ad06-448d-947d-da9cb51de85c",
  "0543027b-7074-4d83-9eb3-3bbdbdfd6856",
  "09c4ea3f-f5bb-4326-a1ad-563640e09432",
];

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
    const environment = {
      DATABASE_URL: process.env.DATABASE_URL!,
      AZURE_API_KEY: process.env.AZURE_API_KEY!,
      AZURE_ENDPOINT: process.env.AZURE_ENDPOINT!,
      AZURE_API_VERSION: process.env.AZURE_API_VERSION!,
    };

    const productsQueue = new sst.aws.Queue("ProductsBroker", {
      fifo: true,
    });

    productsQueue.subscribe(
      {
        handler: "functions/products-broker.handler",
        environment,
      },
      {
        transform: {
          eventSourceMapping: {
            scalingConfig: {
              maximumConcurrency: 5,
            },
          },
        },
      }
    );

    const clientsQueue = new sst.aws.Queue("ClientsBroker");

    clientsQueue.subscribe({
      handler: "functions/clients-broker.handler",
      environment,
    });

    const finishCart = new sst.aws.Queue("FinishCart");

    finishCart.subscribe({
      handler: "functions/finish-cart.handler",
      environment,
    });

    const carts = cartQueues.map(
      (workspaceId) =>
        new sst.aws.Queue(`CartBroker-${workspaceId}`, {
          fifo: true,
        })
    );

    return {
      productsQueue: productsQueue.url,
      clientsQueue: clientsQueue.url,
      carts: carts.map((q) => q.url),
      finishCart: finishCart.url,
    };
  },
});
