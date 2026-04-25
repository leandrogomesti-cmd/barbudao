import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { creditWallet } from '@/lib/firebase/firestore-wallet';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('pagarme-signature');
    const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[PAGARME WEBHOOK] Configuração PAGARME_WEBHOOK_SECRET ausente.');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing Signature' }, { status: 401 });
    }

    // Validate HMAC SHA256 Signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[PAGARME WEBHOOK] Assinatura inválida', { received: signature, expected: expectedSignature });
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // We only care about order.paid
    if (payload.type === 'order.paid') {
      const order = payload.data;
      const metadata = order.metadata || {};

      if (metadata.type === 'wallet_deposit' && metadata.firebase_user_id) {
        const userId = metadata.firebase_user_id;
        // Pagar.me amount is in cents
        const amountPaidCents = order.amount;
        const amountBRL = amountPaidCents / 100;

        const transactionId = `pix_${order.id}`;

        console.log(`[PAGARME WEBHOOK] Crediting wallet for user ${userId}: R$ ${amountBRL}`);
        
        await creditWallet({
          userId,
          amount: amountBRL,
          pagarmeOrderId: order.id,
          transactionId,
          description: 'Depósito PIX via Pagar.me'
        });
      }
    }

    // Always return 200 OK so Pagar.me knows we received it
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[PAGARME WEBHOOK] Erro interno:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
