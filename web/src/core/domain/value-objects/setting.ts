export type SettingProps = {
  wabaId: string;
  attendantName: string;
  businessName: string;
  locationAvailable: string;
  paymentMethods: string;
  vectorNamespace: string;
  knowledgeBase: string;
  aiEnabled: boolean;
};

export class Setting {
  constructor(
    readonly wabaId: string,
    readonly attendantName: string,
    readonly businessName: string,
    readonly locationAvailable: string,
    readonly paymentMethods: string,
    readonly vectorNamespace: string,
    readonly knowledgeBase: string,
    readonly aiEnabled: boolean
  ) {}

  raw() {
    return {
      wabaId: this.wabaId,
      attendantName: this.attendantName,
      businessName: this.businessName,
      locationAvailable: this.locationAvailable,
      paymentMethods: this.paymentMethods,
      vectorNamespace: this.vectorNamespace,
      knowledgeBase: this.knowledgeBase,
      aiEnabled: this.aiEnabled,
    };
  }

  static create(props?: SettingProps) {
    return new Setting(
      props?.wabaId ?? "",
      props?.attendantName ?? "Looma AI",
      props?.businessName ?? "",
      props?.locationAvailable ?? "",
      props?.paymentMethods ?? "",
      props?.vectorNamespace ?? "",
      props?.knowledgeBase ?? "",
      props?.aiEnabled ?? true
    );
  }
}
