export type SettingProps = {
  wabaId: string;
};

export class Setting {
  constructor(readonly wabaId: string) {}

  raw() {
    return {
      wabaId: this.wabaId,
    };
  }

  static create(props?: SettingProps) {
    return new Setting(props?.wabaId ?? "");
  }
}
