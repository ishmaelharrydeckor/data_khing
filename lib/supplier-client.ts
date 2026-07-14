import crypto from "crypto";
import { prisma } from "./prisma";

export interface SupplierProduct {
  id: string;
  network: "YELLO" | "TELECEL" | "AT_PREMIUM";
  label: string;
  dataAmountGB: number;
  wholesalePricePesewas: number;
}

export interface SupplierOrderResponse {
  supplierPurchaseId: string;
  supplierOrderRef: string;
  status: "PROCESSING" | "DELIVERED" | "FAILED";
}

// Interface that both Mock and Real clients must satisfy
export interface ISupplierClient {
  getStoreProfile(): Promise<{ status: string; name: string }>;
  getWalletBalance(): Promise<number>; // returns balance in pesewas
  getProducts(): Promise<SupplierProduct[]>;
  placeOrder(params: {
    phoneNumber: string;
    network: "YELLO" | "TELECEL" | "AT_PREMIUM";
    capacity: number; // in GB
    idempotencyKey: string;
  }): Promise<SupplierOrderResponse>;
  checkOrderStatus(reference: string): Promise<{ status: "PROCESSING" | "DELIVERED" | "FAILED" }>;
}

// ----------------------------------------------------
// Mock Implementation (Mirrors real behavior)
// ----------------------------------------------------
class MockSupplierClient implements ISupplierClient {
  async getStoreProfile() {
    return { status: "ACTIVE", name: "Mock Store Platform" };
  }

  async getWalletBalance() {
    // Return a mocked balance, say 500,000 pesewas (5,000 GHS)
    // We can sync this with a database SupplierAccount or just return a default
    const account = await prisma.supplierAccount.findFirst();
    if (!account) {
      const newAccount = await prisma.supplierAccount.create({
        data: { balancePesewas: 500000, rateLimitRemaining: 60 },
      });
      return newAccount.balancePesewas;
    }
    return account.balancePesewas;
  }

  async getProducts(): Promise<SupplierProduct[]> {
    return [
      { id: "mtn-1gb", network: "YELLO", label: "MTN 1GB Bundle", dataAmountGB: 1.0, wholesalePricePesewas: 300 }, // GH₵3
      { id: "mtn-5gb", network: "YELLO", label: "MTN 5GB Bundle", dataAmountGB: 5.0, wholesalePricePesewas: 1200 }, // GH₵12
      { id: "mtn-10gb", network: "YELLO", label: "MTN 10GB Bundle", dataAmountGB: 10.0, wholesalePricePesewas: 2200 }, // GH₵22
      { id: "telecel-2gb", network: "TELECEL", label: "Telecel 2GB Bundle", dataAmountGB: 2.0, wholesalePricePesewas: 500 }, // GH₵5
      { id: "telecel-5gb", network: "TELECEL", label: "Telecel 5GB Bundle", dataAmountGB: 5.0, wholesalePricePesewas: 1100 }, // GH₵11
      { id: "at-3gb", network: "AT_PREMIUM", label: "AirtelTigo 3GB Bundle", dataAmountGB: 3.0, wholesalePricePesewas: 600 }, // GH₵6
    ];
  }

  async placeOrder(params: {
    phoneNumber: string;
    network: "YELLO" | "TELECEL" | "AT_PREMIUM";
    capacity: number;
    idempotencyKey: string;
  }): Promise<SupplierOrderResponse> {
    // Basic validation
    if (!params.phoneNumber || params.phoneNumber.length < 9) {
      throw new Error("INVALID_PHONE");
    }

    // Check balance
    const balance = await this.getWalletBalance();
    // find product to get cost
    const products = await this.getProducts();
    const product = products.find(p => p.network === params.network && p.dataAmountGB === params.capacity);
    const cost = product ? product.wholesalePricePesewas : 1000;

    if (balance < cost) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // Deduct mock balance
    await prisma.supplierAccount.updateMany({
      data: {
        balancePesewas: { decrement: cost },
        lastSyncedAt: new Date()
      }
    });

    const supplierPurchaseId = "pur_" + crypto.randomBytes(8).toString("hex");
    const supplierOrderRef = "ref_" + crypto.randomBytes(8).toString("hex");

    return {
      supplierPurchaseId,
      supplierOrderRef,
      status: "DELIVERED",
    };
  }

  async checkOrderStatus(reference: string) {
    return { status: "DELIVERED" as const };
  }
}

// ----------------------------------------------------
// Real API Integration (DataMart Store API Contract)
// ----------------------------------------------------
class RealSupplierClient implements ISupplierClient {
  private getHeaders(idempotencyKey?: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.SUPPLIER_API_KEY}`,
    };
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }
    return headers;
  }

  private async makeRequest(path: string, method: string, body?: any, idempotencyKey?: string) {
    const baseUrl = "https://api.datamartgh.shop/api/store/v1";
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: this.getHeaders(idempotencyKey),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorBody: any = {};
      try {
        errorBody = await res.json();
      } catch (e) {}

      const errorCode = errorBody?.code || "UNKNOWN_ERROR";
      const status = res.status;

      // Handle SPECIFIC DataMart errors as described in Section 5
      if (status === 401) {
        throw new Error("CRITICAL_AUTH_ERROR: " + errorCode);
      } else if (status === 403) {
        throw new Error("CRITICAL_FORBIDDEN_ERROR: " + errorCode);
      } else if (status === 402 || errorCode === "INSUFFICIENT_BALANCE") {
        throw new Error("INSUFFICIENT_BALANCE");
      } else if (errorCode === "INVALID_PHONE" || errorCode === "PHONE_NETWORK_MISMATCH") {
        throw new Error("INVALID_PHONE");
      } else if (errorCode === "BUNDLE_NOT_OFFERED") {
        throw new Error("BUNDLE_NOT_OFFERED");
      } else if (status === 429) {
        const retryAfter = errorBody?.retryAfter || 5;
        throw new Error(`RATE_LIMIT_EXCEEDED:${retryAfter}`);
      } else if (status === 503 || errorCode === "AUTH_BACKEND_UNAVAILABLE") {
        throw new Error("AUTH_BACKEND_UNAVAILABLE");
      }
      throw new Error(`SUPPLIER_ERROR:${status}:${errorCode}`);
    }

    return res.json();
  }

  async getStoreProfile() {
    return this.makeRequest("/store", "GET");
  }

  async getWalletBalance() {
    const data = await this.makeRequest("/wallet/balance", "GET");
    // Returns GHS. Convert to Pesewas
    const balanceGHS = parseFloat(data.deposit?.balance || "0");
    return Math.round(balanceGHS * 100);
  }

  async getProducts(): Promise<SupplierProduct[]> {
    const response = await this.makeRequest("/products", "GET");
    const productsList = Array.isArray(response) ? response : (response.data || []);
    
    return productsList.map((item: any) => {
      // Map networks
      let net: "YELLO" | "TELECEL" | "AT_PREMIUM" = "YELLO";
      if (item.network === "TELECEL") net = "TELECEL";
      else if (item.network === "AT_PREMIUM" || item.network === "AIRTELTIGO") net = "AT_PREMIUM";

      return {
        id: item.id || item.productId,
        network: net,
        label: item.displayName || item.name || item.label || `${net} ${item.capacity}GB`,
        dataAmountGB: parseFloat(item.capacity || "0"),
        wholesalePricePesewas: Math.round(parseFloat(item.basePrice || item.price || "0") * 100),
      };
    });
  }

  async placeOrder(params: {
    phoneNumber: string;
    network: "YELLO" | "TELECEL" | "AT_PREMIUM";
    capacity: number;
    idempotencyKey: string;
  }): Promise<SupplierOrderResponse> {
    const body = {
      phoneNumber: params.phoneNumber,
      network: params.network,
      capacity: params.capacity,
    };
    const data = await this.makeRequest("/orders", "POST", body, params.idempotencyKey);
    return {
      supplierPurchaseId: data.id || data.purchaseId || "",
      supplierOrderRef: data.reference || data.orderRef || "",
      status: (data.status === "delivered" || data.status === "DELIVERED") ? "DELIVERED"
            : (data.status === "failed" || data.status === "FAILED") ? "FAILED" : "PROCESSING",
    };
  }

  async checkOrderStatus(reference: string): Promise<{ status: "PROCESSING" | "DELIVERED" | "FAILED" }> {
    const data = await this.makeRequest(`/orders/${reference}`, "GET");
    const status = (data.status === "delivered" || data.status === "DELIVERED") ? "DELIVERED"
          : (data.status === "failed" || data.status === "FAILED") ? "FAILED" : "PROCESSING";
    return {
      status: status as "PROCESSING" | "DELIVERED" | "FAILED"
    };
  }
}

const isMock = process.env.MOCK_MODE !== "false";
export const supplierClient: ISupplierClient = isMock ? new MockSupplierClient() : new RealSupplierClient();
