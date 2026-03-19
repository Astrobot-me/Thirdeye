import { useState } from "react";

const PAISA = 1000;

type PaymentIntentType = {
  recipient_vpa: string;
  amount: Number;
};

export function usePaymentService() {
  const [vpa, setVPA] = useState<string | null>(null);

  const createPayment = (intent: PaymentIntentType) => {};

  const transact = (vpa: string, reciepient_id: string) => {
    setVPA(vpa);

    try {
      const beneficiary = getBeneficiary(reciepient_id);
      if (beneficiary) {
      } else {
        const newBeneficiary = addBeneficiary(reciepient_id);
      }
    } catch (error) {}
  };
  const addBeneficiary = (id: string) => {
    return { added: true };
  };
  const getBeneficiary = (id: string) => {
    return null;
  };

  const getPaymentStatus = () => {};

  return {
    transact,
    getPaymentStatus,
  };
}
