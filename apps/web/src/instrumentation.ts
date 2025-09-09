// import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
// import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
// import { resourceFromAttributes } from "@opentelemetry/resources";
// import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
// import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
// import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// export function register() {
//   const COLLECTOR_ENDPOINT = process.env.PHOENIX_COLLECTOR_ENDPOINT;
//   const SERVICE_NAME = "LoomaApp";

//   const provider = new NodeTracerProvider({
//     resource: resourceFromAttributes({
//       [ATTR_SERVICE_NAME]: SERVICE_NAME,
//       [SEMRESATTRS_PROJECT_NAME]: SERVICE_NAME,
//     }),
//     spanProcessors: [
//       new BatchSpanProcessor(
//         new OTLPTraceExporter({
//           url: `${COLLECTOR_ENDPOINT}/v1/traces`,
//           headers: { Authorization: `Bearer ${process.env.PHOENIX_API_KEY}` },
//         })
//       ),
//     ],
//   });

//   diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

//   provider.register();
// }
