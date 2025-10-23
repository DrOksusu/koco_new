import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

// GET all diagnosis definitions (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const definitions = await prisma.diagnosisDefinition.findMany({
      orderBy: {
        displayOrder: 'asc'
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedDefinitions = definitions.map(def => ({
      ...def,
      id: def.id.toString(),
      createdAt: def.createdAt.toISOString(),
      updatedAt: def.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      definitions: serializedDefinitions,
      count: serializedDefinitions.length
    });
  } catch (error) {
    console.error('Error fetching diagnosis definitions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch diagnosis definitions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new diagnosis definition
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
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

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const definition = await prisma.diagnosisDefinition.create({
      data: {
        name,
        unit: unit || '',
        meanValue: meanValue !== undefined ? parseFloat(meanValue) : null,
        titleKo,
        titleEn,
        fullName,
        description,
        normalRangeMin: normalRangeMin !== undefined ? parseFloat(normalRangeMin) : null,
        normalRangeMax: normalRangeMax !== undefined ? parseFloat(normalRangeMax) : null,
        interpretationHigh,
        interpretationLow,
        clinicalNote,
        calculationMethod,
        referenceSource,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0,
        isActive: isActive !== undefined ? isActive : true
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
    console.error('Error creating diagnosis definition:', error);
    return NextResponse.json(
      {
        error: 'Failed to create diagnosis definition',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
