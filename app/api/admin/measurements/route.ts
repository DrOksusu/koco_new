import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

// GET all measurement definitions (admin only)
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

    const definitions = await prisma.measurementDefinition.findMany({
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
    console.error('Error fetching measurement definitions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch measurement definitions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new measurement definition
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
      category,
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
      measurementMethod,
      referenceSource,
      displayOrder,
      isActive
    } = body;

    // Validate required fields
    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, category, and unit are required' },
        { status: 400 }
      );
    }

    const definition = await prisma.measurementDefinition.create({
      data: {
        name,
        category,
        unit,
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
        measurementMethod,
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
    console.error('Error creating measurement definition:', error);
    return NextResponse.json(
      {
        error: 'Failed to create measurement definition',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
