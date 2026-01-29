import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantAdminGuard } from '../auth/guards/tenant-admin.guard';

describe('ClientsController', () => {
  let controller: ClientsController;

  const mockClientsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    socialSummary: jest.fn(),
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantAdminGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists clients for tenant', async () => {
    mockClientsService.findAll.mockResolvedValue([{ id: 'c1' }]);
    const req = { user: { tenantId: 't1' } };
    await expect(controller.findAll(req as any)).resolves.toEqual([{ id: 'c1' }]);
    expect(mockClientsService.findAll).toHaveBeenCalledWith('t1');
  });

  it('creates a client', async () => {
    mockClientsService.create.mockResolvedValue({ id: 'c1', name: 'Acme' });
    const req = { user: { tenantId: 't1' } };
    await expect(controller.create(req as any, { name: 'Acme' })).resolves.toEqual({
      id: 'c1',
      name: 'Acme',
    });
    expect(mockClientsService.create).toHaveBeenCalledWith('t1', { name: 'Acme' });
  });

  it('gets social summary', async () => {
    mockClientsService.socialSummary.mockResolvedValue({ clientId: 'c1', hasAnyDestination: false });
    const req = { user: { tenantId: 't1' } };
    await expect(controller.socialSummary(req as any, 'c1')).resolves.toEqual({
      clientId: 'c1',
      hasAnyDestination: false,
    });
    expect(mockClientsService.socialSummary).toHaveBeenCalledWith('t1', 'c1');
  });
});

