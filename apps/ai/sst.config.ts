/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "looma-ai",
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
      AZURE_MEDIA_API_KEY: process.env.AZURE_MEDIA_API_KEY!,
      AZURE_VOICE_ENDPOINT: process.env.AZURE_VOICE_ENDPOINT!,
      AZURE_IMAGE_ENDPOINT: process.env.AZURE_IMAGE_ENDPOINT!,
      OTEL_EXPORTER_OTLP_HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS!,
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT!,
      PHOENIX_COLLECTOR_ENDPOINT: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
      PHOENIX_API_KEY: process.env.PHOENIX_API_KEY!,
      META_TOKEN: process.env.META_TOKEN!,
      META_APP_SECRET: process.env.META_APP_SECRET!,
      REDIS_URL: process.env.REDIS_URL!,
    };

    const aiFunction = new sst.aws.Function("AIFunction", {
      handler: "functions/ai.handler",
      environment,
      url: true,
      timeout: `900 seconds`,
      memory: "256 MB",
      permissions: [
        {
          actions: ["sqs:*"],
          resources: ["*"],
          effect: "allow",
        },
      ],
    });

    return {
      aiFunction: aiFunction.url,
    };
  },
});
