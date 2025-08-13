export type AddressRaw = {
  id?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  note: string | null;
};
export class Address {
  constructor(
    readonly id: string,
    readonly street: string,
    readonly number: string,
    readonly neighborhood: string,
    readonly city: string,
    readonly state: string,
    readonly zipCode: string,
    readonly _country: string,
    readonly note: string
  ) {}

  get country() {
    return this._country ?? "BR";
  }

  raw() {
    return {
      id: this.id,
      street: this.street,
      number: this.number,
      neighborhood: this.neighborhood,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      country: this.country,
      note: this.note,
    };
  }

  validate(): { isValid: boolean; missingFields: string[] } {
    const requiredFields: (keyof Address)[] = [
      "street",
      "number",
      "neighborhood",
      "city",
      "state",
      "zipCode",
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = this[field] as string;
      return value.trim().length === 0;
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  static create(props: AddressRaw): Address {
    const {
      id,
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
      country,
      note,
    } = props;

    return new Address(
      id ?? crypto.randomUUID().toString(),
      street ?? "",
      number ?? "",
      neighborhood ?? "",
      city ?? "",
      state ?? "",
      zipCode ?? "",
      country ?? "",
      note ?? ""
    );
  }

  isEmpty() {
    return (
      !this.street &&
      !this.number &&
      !this.neighborhood &&
      !this.city &&
      !this.state &&
      !this.zipCode &&
      !this.country
    );
  }

  fullAddress(): string {
    return `${this.street}, ${this.number}, ${this.neighborhood}, ${this.city} - ${this.state}, ${this.zipCode}, ${this.country}`;
  }
}
