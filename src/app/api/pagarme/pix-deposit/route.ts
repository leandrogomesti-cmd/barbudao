import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifySessionToken(sessionToken);
    if (!decoded?.uid) {
      return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { amount } = body; // amount in BRL (ex: 50.00)

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Valor mínimo deve ser R$ 1,00' }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);
    const pagarmeSecret = process.env.PAGARME_SECRET_KEY_LIVE;

    if (!pagarmeSecret) {
      console.error('[PAGARME] PAGARME_SECRET_KEY_LIVE not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // 3. Create Order in Pagar.me
    const response = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${pagarmeSecret}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        items: [
          {
            amount: amountInCents,
            description: 'Depósito na Carteira PIX',
            quantity: 1,
          },
        ],
        customer: {
          name: decoded.name || 'Usuário da Barbearia',
          email: decoded.email || 'usuario@barbeariadelpierro.com',
          type: 'individual',
          document: '00000000000', // Placeholder as it's required by pagarme in some configs, though often optional for basic Pix. Let's send a generic or omit if possible.
          phones: {
            mobile_phone: {
              country_code: '55',
              area_code: '11',
              number: '999999999'
            }
          }
        },
        payments: [
          {
            payment_method: 'pix',
            pix: {
              expires_in: 3600,
            },
          },
        ],
        metadata: {
          type: 'wallet_deposit',
          firebase_user_id: decoded.uid,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[PAGARME] Order Creation Error:', data);
      return NextResponse.json({ error: 'Falha ao gerar cobrança PIX', details: data }, { status: response.status });
    }

    // Pagar.me v5 returns the pix details in charges[0].last_transaction.qr_code_url / qr_code
    const charge = data.charges?.[0];
    const qrCodeUrl = charge?.last_transaction?.qr_code_url;
    const qrCodeText = charge?.last_transaction?.qr_code;

    return NextResponse.json({
      orderId: data.id,
      qrCodeUrl,
      qrCodeText,
      amount: amount,
    });
  } catch (error: any) {
    console.error('[PAGARME] Internal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
