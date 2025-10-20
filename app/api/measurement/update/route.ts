import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { measurements, diagnosis, patientId } = body;

    // Here you would typically save to database
    // For now, we'll just return success

    console.log('Received measurement update:', {
      measurementCount: measurements ? Object.keys(measurements).length : 0,
      diagnosisCount: diagnosis ? Object.keys(diagnosis).length : 0,
      patientId
    });

    return NextResponse.json({
      success: true,
      message: 'Measurements updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating measurements:', error);
    return NextResponse.json(
      { error: 'Failed to update measurements' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Mock data for testing
    const mockData = {
      measurements: {
        SNA: 82.5,
        SNB: 78.3,
        ANB: 4.2,
        IMPA: 92.1,
        FMA: 28.5
      },
      diagnosis: {
        HGI: 13.2,
        VGI: 8.7,
        APDI: 86.3,
        ODI: 74.5
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}