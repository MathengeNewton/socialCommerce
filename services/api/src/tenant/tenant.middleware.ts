import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface UserWithTenant {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { user?: UserWithTenant }, res: Response, next: NextFunction) {
    // Extract tenant from JWT (set by JwtStrategy)
    // This ensures tenant is always available in request context
    if (req.user?.tenantId) {
      req['tenantId'] = req.user.tenantId;
    }
    next();
  }
}
