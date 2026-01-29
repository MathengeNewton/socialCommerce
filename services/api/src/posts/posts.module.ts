import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LinkGenerationModule } from '../link-generation/link-generation.module';
import { PublishingModule } from '../publishing/publishing.module';

@Module({
  imports: [PrismaModule, LinkGenerationModule, PublishingModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
