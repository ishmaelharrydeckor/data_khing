export interface PaystackInitResponse {
  authorizationUrl: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "pending";
  amountPesewas: number;
  reference: string;
  channel: string;
}

class MockPaymentClient {
  async initializePayment(email: string, amountPesewas: number, callbackUrl: string): Promise<PaystackInitResponse> {
    const reference = "pay_mock_" + Math.random().toString(36).substring(2, 15);
    // Mock checkout page is simulated by directing them to a success callback or custom dev page
    return {
      authorizationUrl: `${callbackUrl}?reference=${reference}`,
      reference,
    };
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    // If reference starts with pay_mock_ or standard, treat it as success in mock mode
    if (reference.startsWith("pay_mock_")) {
      return {
        status: "success",
        amountPesewas: 1000, // mock amount or read from some state
        reference,
        channel: "mobile_money",
      };
    }
    return {
      status: "failed",
      amountPesewas: 0,
      reference,
      channel: "unknown",
    };
  }
}

class RealPaymentClient {
  private getHeaders() {
    return {
      "Authorization": `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async initializePayment(email: string, amountPesewas: number, callbackUrl: string): Promise<PaystackInitResponse> {
    const amountGHS = amountPesewas / 100;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        email,
        amount: Math.round(amountPesewas), // Paystack takes amount in kobo/pesewas directly
        callback_url: callbackUrl,
        channels: ["mobile_money", "card"],
      }),
    });

    if (!res.ok) {
      throw new Error(`Paystack initialize failed with status ${res.status}`);
    }

    const json = await res.json();
    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
    };
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Paystack verification failed with status ${res.status}`);
    }

    const json = await res.json();
    const data = json.data;

    let status: "success" | "failed" | "pending" = "pending";
    if (data.status === "success") status = "success";
    else if (data.status === "failed") status = "failed";

    return {
      status,
      amountPesewas: data.amount, // paystack returns amount in minor units (kobo/pesewas)
      reference: data.reference,
      channel: data.channel,
    };
  }
}

const isMock = process.env.MOCK_MODE !== "false";
export const paymentClient = isMock ? new MockPaymentClient() : new RealPaymentClient();
export type IPaymentClient = MockPaymentClient | RealPaymentClient;
