import * as amqp from "amqplib";

type SendDataToQueueProps = {
  queueName: string;
  data: unknown;
  workspaceId: string;
};

interface MessagingDriver {
  sendDataToQueue(data: SendDataToQueueProps): Promise<boolean>;
}

export class RabbitMqMessagingDriver implements MessagingDriver {
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;

  private constructor() {}

  static instance() {
    return new RabbitMqMessagingDriver();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost"
      );

      this.channel = await this.connection.createChannel();
      console.log("Conectado ao RabbitMQ");

      this.connection.on("error", async (err) => {
        console.error("Erro na conexão com RabbitMQ:", err);
        await this.connect();
      });
    } catch (error) {
      console.error("Erro ao conectar no RabbitMQ:", error);
      throw error;
    }
  }

  async closeConnection() {
    try {
      await this.channel?.close?.();
      await this.connection?.close?.();
      console.log("Conexão com RabbitMQ fechada.");
    } catch (error) {
      console.error("Erro ao fechar conexão com RabbitMQ:", error);
    }
  }

  async sendDataToQueue({
    queueName,
    data,
    workspaceId,
  }: SendDataToQueueProps): Promise<boolean> {
    try {
      await this.connect();
      if (!this.channel) {
        await this?.connect?.();
      }
      await this.channel.assertQueue(queueName, { durable: true });
      this.channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify({ data, workspaceId })),
        {
          persistent: true,
        }
      );
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem para RabbitMQ:", error);
      return false;
    } finally {
      await this.closeConnection();
    }
  }
}
