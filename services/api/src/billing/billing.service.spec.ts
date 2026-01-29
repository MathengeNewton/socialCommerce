import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { TariffsService } from './tariffs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;

  const mockPrisma = {
    client: { findFirst: jest.fn() },
    usageEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: any) =>
      cb({
        invoice: mockPrisma.invoice,
        usageEvent: mockPrisma.usageEvent,
      }),
    ),
  };

  const mockTariffs = {
    getActiveTariff: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TariffsService, useValue: mockTariffs },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records a usage event with computed amount', async () => {
    mockPrisma.usageEvent.create.mockResolvedValue({ id: 'e1' });
    await service.recordUsageEvent('t1', 'c1', { type: 'post_published', unitPrice: 2.5, quantity: 3 });
    expect(mockPrisma.usageEvent.create).toHaveBeenCalled();
  });

  it('rejects invoice generation when no active tariff', async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: 'c1' });
    mockTariffs.getActiveTariff.mockResolvedValue(null);

    await expect(
      service.generateInvoice('t1', 'c1', new Date('2026-01-01'), new Date('2026-01-08')),
    ).rejects.toThrow(BadRequestException);
  });
});

