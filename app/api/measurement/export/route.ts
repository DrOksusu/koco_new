import { NextRequest, NextResponse } from 'next/server';
import { exportToExcel } from '@/lib/utils/exporters';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';

    // Get data from query params or fetch from database
    const measurements = JSON.parse(searchParams.get('measurements') || '{}');
    const diagnosis = JSON.parse(searchParams.get('diagnosis') || '{}');
    const patientId = searchParams.get('patientId');

    if (format === 'excel') {
      // Generate Excel file
      const filename = await exportToExcel(
        measurements,
        diagnosis,
        { id: patientId || undefined }
      );

      return NextResponse.json({
        success: true,
        filename,
        message: 'Excel file exported successfully'
      });
    }

    return NextResponse.json(
      { error: 'Unsupported export format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}