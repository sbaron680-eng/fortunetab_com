/**
 * TossPayments JavaScript SDK v2 (CDN: https://js.tosspayments.com/v2/standard)
 * PayPal 결제를 위한 최소 타입 선언
 */

interface TossPaymentsWidgetAmount {
  currency: string;
  value: number;
}

interface TossPaymentsWidgetProduct {
  name: string;
  quantity: number;
  unitAmount: number;
  currency: string;
  description?: string;
}

interface TossPaymentsWidgetShipping {
  fullName: string;
  address?: {
    country: string;
    line1?: string;
    line2?: string;
    area1?: string;
    area2?: string;
    postalCode?: string;
  };
}

interface TossPaymentsWidgetRequestParams {
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  foreignEasyPay?: {
    country: string;
    products: TossPaymentsWidgetProduct[];
    shipping?: TossPaymentsWidgetShipping;
    paymentMethodOptions?: {
      paypal?: {
        setTransactionContext?: Record<string, string>;
      };
    };
  };
}

interface TossPaymentsWidgets {
  setAmount(amount: TossPaymentsWidgetAmount): Promise<void>;
  renderPaymentMethods(options: { selector: string; variantKey: string }): Promise<void>;
  renderAgreement(options: { selector: string; variantKey: string }): Promise<void>;
  requestPayment(params: TossPaymentsWidgetRequestParams): Promise<void>;
}

interface TossPaymentsInstance {
  widgets(options: { customerKey: string }): TossPaymentsWidgets;
}

interface TossPaymentsStatic {
  (clientKey: string): TossPaymentsInstance;
  ANONYMOUS: string;
}

interface Window {
  TossPayments?: TossPaymentsStatic;
}
