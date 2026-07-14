import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { PostService } from './post.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PostListDto } from './dto/post-list.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('api/posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  async list(
    @CurrentUser('sub') userId: number,
    @Query() dto: PostListDto,
  ) {
    return this.postService.findPosts({
      keyword: dto.keyword,
      status: dto.status,
      level: dto.level,
      timeFilter: dto.timeFilter,
      userId,
    });
  }

  @Get('mine')
  async mine(
    @CurrentUser('sub') userId: number,
    @Query() dto: PostListDto,
  ) {
    return this.postService.getMyPosts(userId, {
      keyword: dto.keyword,
      level: dto.level,
      timeFilter: dto.timeFilter,
    });
  }

  @Get(':id')
  async detail(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.postService.getPostDetail(parseInt(id, 10), userId);
  }

  @Post()
  async create(
    @CurrentUser('sub') userId: number,
    @Body() body: CreatePostDto,
  ) {
    return this.postService.createPost(userId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
    @Body() body: UpdatePostDto,
  ) {
    return this.postService.updatePost(userId, parseInt(id, 10), body);
  }

  @Delete(':id')
  async remove(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.postService.deletePost(userId, parseInt(id, 10));
  }

  @Post(':id/join')
  async join(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.postService.joinPost(userId, parseInt(id, 10));
  }

  @Post(':id/leave')
  async leave(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
  ) {
    return this.postService.leavePost(userId, parseInt(id, 10));
  }

  @Post(':id/joins/:joinId/approve')
  async approveJoin(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
    @Param('joinId') joinId: string,
  ) {
    return this.postService.approveJoin(userId, parseInt(id, 10), parseInt(joinId, 10));
  }

  @Post(':id/joins/:joinId/reject')
  async rejectJoin(
    @CurrentUser('sub') userId: number,
    @Param('id') id: string,
    @Param('joinId') joinId: string,
  ) {
    return this.postService.rejectJoin(userId, parseInt(id, 10), parseInt(joinId, 10));
  }
}
