import axios from "axios";
import { createDatabaseConnection } from "../../infra/database";
import { settings } from "../../infra/database/schemas";
import { eq } from "drizzle-orm";

export class SyncWaba {
  async execute(input: InputDTO) {
    const db = createDatabaseConnection();

    const metaClient = axios.create({
      baseURL: "https://graph.facebook.com/v23.0",
    });

    const {
      data: { access_token },
    } = await metaClient.get(
      `/oauth/access_token?client_id=${process.env.META_APP_CLIENT_ID}&client_secret=${process.env.META_APP_SECRET}&code=${input.code}`
    );

    const {
      data: { client_business_id: businessId },
    } = await metaClient.get(
      `/me?fields=client_business_id&access_token=${access_token}`
    );

    const {
      data: {
        data: [{ id: wabaId }],
      },
    } = await metaClient.get(
      `/${businessId}/owned_whatsapp_business_accounts?access_token=${access_token}`
    );

    await metaClient.post(
      `/${wabaId}/subscribed_apps?access_token=${access_token}`
    );

    const {
      data: {
        data: [{ id: phoneId }],
      },
    } = await metaClient.get(
      `/${wabaId}/phone_numbers?access_token=${access_token}`
    );

    await db
      .update(settings)
      .set({
        accessToken: access_token,
        businessId,
        wabaId,
        phoneId,
      })
      .where(eq(settings.workspaceId, input.workspaceId));
  }
  static instance() {
    return new SyncWaba();
  }
}
type InputDTO = {
  code: string;
  workspaceId: string;
};
