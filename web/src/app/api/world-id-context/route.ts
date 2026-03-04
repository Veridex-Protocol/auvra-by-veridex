import { NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit/signing';

const WORLDCOIN_RP_ID = process.env.WORLDCOIN_RP_ID || '';
const WORLDCOIN_RP_SIGNING_KEY = process.env.WORLDCOIN_RP_SIGNING_KEY || '';

/**
 * GET /api/world-id-context
 *
 * Generates a signed rp_context for the World ID v4 verification widget.
 * The rp_context includes a fresh nonce, timestamps, and ECDSA signature
 * produced from the RP signing key configured in the Developer Portal.
 */
export async function GET() {
  if (!WORLDCOIN_RP_SIGNING_KEY) {
    return NextResponse.json(
      { error: 'WORLDCOIN_RP_SIGNING_KEY not configured' },
      { status: 500 },
    );
  }

  if (!WORLDCOIN_RP_ID) {
    return NextResponse.json(
      { error: 'WORLDCOIN_RP_ID not configured' },
      { status: 500 },
    );
  }

  try {
    const action = process.env.NEXT_PUBLIC_WORLDCOIN_ACTION || 'verify-admin';
    const sig = signRequest(action, WORLDCOIN_RP_SIGNING_KEY, 300); // 5 min TTL

    return NextResponse.json({
      rp_context: {
        rp_id: WORLDCOIN_RP_ID,
        nonce: sig.nonce,
        created_at: sig.createdAt,
        expires_at: sig.expiresAt,
        signature: sig.sig,
      },
    });
  } catch (error) {
    console.error('[World ID Context Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate rp_context' },
      { status: 500 },
    );
  }
}
