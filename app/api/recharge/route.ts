import { NextResponse } from 'next/server'
import { isApiConfigured, sendTransfer } from '@/lib/api/ding-connect'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      skuCode,
      sendAmount,
      phoneNumber,
      countryCode,
      carrierCode,
      carrierName,
      productName,
      receiveCurrency,
      receiveAmount,
    } = body

    // Validate required fields
    if (!skuCode || !sendAmount || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique reference
    const distributorRef = `TUG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Calculate service fee (configurable)
    const serviceFee = 0.50
    const totalAmount = sendAmount + serviceFee

    // If API is not configured, return mock success
    if (!isApiConfigured()) {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      const mockOrder = {
        id: distributorRef,
        phoneNumber,
        countryCode,
        carrierCode,
        carrierName,
        skuCode,
        productName,
        sendAmount,
        sendCurrency: 'USD',
        receiveAmount,
        receiveCurrency,
        serviceFee,
        totalAmount,
        status: 'completed',
        providerRef: `DING-${Date.now()}`,
        distributorRef,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        rewardPointsEarned: Math.floor(sendAmount),
      }

      return NextResponse.json({
        success: true,
        order: mockOrder,
        message: 'Recharge completed successfully',
      })
    }

    // Make actual API call
    const response = await sendTransfer({
      SkuCode: skuCode,
      SendValue: sendAmount,
      AccountNumber: phoneNumber,
      DistributorRef: distributorRef,
      ValidateOnly: false,
    })

    // Check response
    if (response.ResultCode !== 1) {
      const errorMessage = response.ErrorCodes?.[0]?.Code || 'Unknown error'
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCodes: response.ErrorCodes,
        },
        { status: 400 }
      )
    }

    const transfer = response.TransferRecord

    // Map processing state to our status
    const statusMap: Record<string, string> = {
      Submitted: 'processing',
      Processing: 'processing',
      Complete: 'completed',
      Failed: 'failed',
      Cancelled: 'failed',
    }

    const order = {
      id: distributorRef,
      phoneNumber: transfer.AccountNumber,
      countryCode,
      carrierCode,
      carrierName,
      skuCode,
      productName,
      sendAmount: transfer.Price.SendValue,
      sendCurrency: transfer.Price.SendCurrencyIso,
      receiveAmount: transfer.Price.ReceiveValue,
      receiveCurrency: transfer.Price.ReceiveCurrencyIso,
      serviceFee,
      totalAmount: transfer.Price.SendValue + serviceFee,
      status: statusMap[transfer.ProcessingState] || 'processing',
      providerRef: transfer.TransferId.TransferRef,
      distributorRef: transfer.TransferId.DistributorRef,
      receiptText: transfer.ReceiptText,
      createdAt: transfer.StartedUtc,
      completedAt: transfer.CompletedUtc,
      rewardPointsEarned: Math.floor(transfer.Price.SendValue),
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Recharge processed successfully',
    })
  } catch (error) {
    console.error('Error processing recharge:', error)
    return NextResponse.json(
      { error: 'Failed to process recharge' },
      { status: 500 }
    )
  }
}

// Get recharge status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    )
  }

  // For now, return mock status
  // In production, this would check the actual order status from DingConnect
  return NextResponse.json({
    orderId,
    status: 'completed',
    message: 'Order completed successfully',
  })
}
