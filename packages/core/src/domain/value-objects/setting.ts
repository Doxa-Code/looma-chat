export type SettingProps = {
  wabaId: string;
  phoneId: string;
  attendantName: string;
  businessName: string;
  locationAvailable: string;
  paymentMethods: string;
  knowledgeBase: string;
  aiEnabled: boolean;
  queueURL: string;
  openingHours: string;
};

export class Setting {
  constructor(
    readonly wabaId: string,
    readonly phoneId: string,
    readonly attendantName: string,
    readonly businessName: string,
    readonly locationAvailable: string,
    readonly paymentMethods: string,
    readonly knowledgeBase: string,
    readonly aiEnabled: boolean,
    readonly queueURL: string,
    readonly openingHours: string
  ) {}

  raw() {
    return {
      wabaId: this.wabaId,
      phoneId: this.phoneId,
      attendantName: this.attendantName,
      businessName: this.businessName,
      locationAvailable: this.locationAvailable,
      paymentMethods: this.paymentMethods,
      knowledgeBase: this.knowledgeBase,
      aiEnabled: this.aiEnabled,
      queueURL: this.queueURL,
      openingHours: this.openingHours,
    };
  }

  static create(props?: SettingProps) {
    return new Setting(
      props?.wabaId ?? "",
      props?.phoneId ?? "",
      props?.attendantName ?? "Looma AI",
      props?.businessName ?? "",
      props?.locationAvailable ?? "",
      props?.paymentMethods ?? "",
      props?.knowledgeBase ?? "",
      props?.aiEnabled ?? true,
      props?.queueURL ?? "",
      props?.openingHours ?? ""
    );
  }
}
