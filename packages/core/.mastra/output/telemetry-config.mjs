import { OpenInferenceOTLPTraceExporter, isOpenInferenceSpan } from '@arizeai/openinference-mastra';

const telemetry = {
  serviceName: "LoomaAI",
  enabled: true,
  export: {
    type: "custom",
    exporter: new OpenInferenceOTLPTraceExporter({
      url: process.env.PHOENIX_COLLECTOR_ENDPOINT,
      headers: {
        Authorization: `Bearer ${process.env.PHOENIX_API_KEY}`
      },
      spanFilter: isOpenInferenceSpan
    })
  }
};

export { telemetry };
