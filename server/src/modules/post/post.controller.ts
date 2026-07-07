import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { PostService } from './post.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PostListDto } from './dto/post-list.dto';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('api/posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  async list(
    @CurrentUser('sub') userId: number,
    @Query() dto: PostListDto,
  ) {
    return this.postService.findPosts({ keyword: dto.keyword, status: dto.status, userId });
  }

  @Get('mine')
  async mine(@CurrentUser('sub') userId: number) {
    return this.postService.findPosts({ userId });
  }

  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: CreatePostDto,
  ) {
    return this.postService.createPost(userId, body);
  }

  @Post(':id/join')
  async join(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.postService.joinPost(userId, parseInt(id));
  }
}
