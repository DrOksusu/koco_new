import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

// GET single diagnosis definition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const definition = await prisma.diagnosisDefinition.findUnique({
      where: { id: BigInt(params.id) }
    });

    if (!definition) {
      return NextResponse.json(
        { error: 'Diagnosis definition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      definition: {
        ...definition,
        id: definition.id.toString(),
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching diagnosis definition:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch diagnosis definition',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update diagnosis definition
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      unit,
      meanValue,
      titleKo,
      titleEn,
      fullName,
      description,
      normalRangeMin,
      normalRangeMax,
      interpretationHigh,
      interpretationLow,
      clinicalNote,
      calculationMethod,
      referenceSource,
      displayOrder,
      isActive
    } = body;

    const definition = await prisma.diagnosisDefinition.update({
      where: { id: BigInt(params.id) },
      data: {
        name,
        unit,
        meanValue: meanValue !== undefined && meanValue !== null ? parseFloat(meanValue) : null,
        titleKo,
        titleEn,
        fullName,
        description,
        normalRangeMin: normalRangeMin !== undefined && normalRangeMin !== null ? parseFloat(normalRangeMin) : null,
        normalRangeMax: normalRangeMax !== undefined && normalRangeMax !== null ? parseFloat(normalRangeMax) : null,
        interpretationHigh,
        interpretationLow,
        clinicalNote,
        calculationMethod,
        referenceSource,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    return NextResponse.json({
      success: true,
      definition: {
        ...definition,
        id: definition.id.toString(),
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating diagnosis definition:', error);
    return NextResponse.json(
      {
        error: 'Failed to update diagnosis definition',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete (deactivate) diagnosis definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    const definition = await prisma.diagnosisDefinition.update({
      where: { id: BigInt(params.id) },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Diagnosis definition deactivated',
      definition: {
        ...definition,
        id: definition.id.toString(),
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error deleting diagnosis definition:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete diagnosis definition',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
