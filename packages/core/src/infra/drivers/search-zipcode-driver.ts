import axios from "axios";
import { Address, AddressRaw } from "../../domain/value-objects/address";

type SearchZipCodeDriverOutput = {
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
};

interface SearchZipCodeDriver {
  search(cep: string): Promise<SearchZipCodeDriverOutput>;
}

export class BrasilAPISearchZipCodeDriver implements SearchZipCodeDriver {
  private client = axios.create({
    baseURL: "https://brasilapi.com.br/api/cep/v1",
  });
  async search(zipcode: string): Promise<SearchZipCodeDriverOutput> {
    try {
      const response = await this.client.get<{
        cep: string;
        state: string;
        city: string;
        neighborhood: string;
        street: string;
      }>(`/${zipcode}`);

      const result: SearchZipCodeDriverOutput = {
        zipCode: response.data.cep,
        state: response.data.state,
        city: response.data.city,
        neighborhood: response.data.neighborhood,
        street: response.data.street,
      };

      return result;
    } catch (err: any) {
      console.log(err?.response?.data ?? err.message);
      return {
        zipCode: zipcode,
        state: "",
        city: "",
        neighborhood: "",
        street: "",
      };
    }
  }

  static instance() {
    return new BrasilAPISearchZipCodeDriver();
  }
}
