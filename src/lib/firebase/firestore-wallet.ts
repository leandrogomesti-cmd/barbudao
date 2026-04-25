import 'server-only';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreditWalletParams {
  userId: string;
  amount: number;
  pagarmeOrderId: string;
  transactionId: string;
  description: string;
}

/**
 * Credita o valor na carteira do usuário de forma atômica no Firestore.
 */
export async function creditWallet(params: CreditWalletParams) {
  const { db } = getFirebaseAdmin();
  const walletRef = db.collection('wallets').doc(params.userId);

  const transactionData = {
    id: params.transactionId,
    description: params.description,
    amount: params.amount,
    date: new Date().toISOString(),
    type: 'CREDIT',
    pagarmeOrderId: params.pagarmeOrderId,
  };

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(walletRef);

    if (!doc.exists) {
      // Cria a carteira se não existir
      transaction.set(walletRef, {
        userId: params.userId,
        balance: params.amount,
        transactions: [transactionData],
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Verifica se a transação já foi processada (idempotência básica)
      const data = doc.data();
      const existingTx = data?.transactions?.find((tx: any) => tx.id === params.transactionId);
      
      if (existingTx) {
        console.warn(`[WALLET] Transação ${params.transactionId} já processada para usuário ${params.userId}. Ignorando.`);
        return;
      }

      // Atualiza saldo e adiciona transação ao array
      transaction.update(walletRef, {
        balance: FieldValue.increment(params.amount),
        transactions: FieldValue.arrayUnion(transactionData),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
