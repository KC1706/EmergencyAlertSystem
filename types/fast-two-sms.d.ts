declare module 'fast-two-sms' {
  interface SendOptions {
    authorization: string | undefined;
    message: string;
    numbers: string;
    route?: string;
    flash?: number;
  }

  interface SMSResponse {
    return: boolean;
    request_id: string;
    message: string[];
  }

  export function sendMessage(options: SendOptions): Promise<SMSResponse>;
}