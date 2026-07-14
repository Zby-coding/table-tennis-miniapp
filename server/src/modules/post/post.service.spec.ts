import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PostService, JoinStatus } from './post.service';
import { MatchPost, PostStatus } from '../../entities/match-post.entity';
import { PostJoin } from '../../entities/post-join.entity';

const mockQueryBuilder = (affected = 1) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected }),
});

describe('PostService', () => {
  let service: PostService;
  let postRepo: jest.Mocked<Pick<Repository<MatchPost>, 'findOne' | 'save' | 'create' | 'createQueryBuilder'>>;
  let joinRepo: jest.Mocked<Pick<Repository<PostJoin>, 'findOne' | 'save' | 'remove'>> & {
    manager: { transaction: jest.Mock };
  };

  const recruitingPost: MatchPost = {
    id: 1,
    userId: 10,
    courtId: 1,
    title: '测试约球',
    totalCapacity: 4,
    joinedCount: 1,
    startTime: new Date(),
    feeType: '免费',
    feeValue: 0,
    description: '',
    status: PostStatus.RECRUITING,
    requireApproval: true,
  } as MatchPost;

  beforeEach(async () => {
    const txManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
      save: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    postRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (p) => p),
      create: jest.fn().mockImplementation((d) => d),
      createQueryBuilder: jest.fn(),
    };

    joinRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
      manager: {
        transaction: jest.fn(async (cb: (m: typeof txManager) => Promise<void>) => cb(txManager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: getRepositoryToken(MatchPost), useValue: postRepo },
        { provide: getRepositoryToken(PostJoin), useValue: joinRepo },
      ],
    }).compile();

    service = module.get(PostService);
  });

  describe('joinPost', () => {
    it('requireApproval=true 时创建 pending，不增加 joinedCount', async () => {
      postRepo.findOne.mockResolvedValue({ ...recruitingPost, requireApproval: true });
      joinRepo.findOne.mockResolvedValue(null);

      const result = await service.joinPost(20, 1);

      expect(joinRepo.save).toHaveBeenCalledWith({
        postId: 1,
        userId: 20,
        status: JoinStatus.PENDING,
      });
      expect(result.status).toBe(JoinStatus.PENDING);
      expect(joinRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('requireApproval=false 时直接 approved 并占名额', async () => {
      postRepo.findOne.mockResolvedValue({ ...recruitingPost, requireApproval: false });
      joinRepo.findOne.mockResolvedValue(null);

      const result = await service.joinPost(20, 1);

      expect(result.status).toBe(JoinStatus.APPROVED);
      expect(joinRepo.manager.transaction).toHaveBeenCalled();
    });

    it('已是 pending 时抛出 BadRequestException', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);
      joinRepo.findOne.mockResolvedValue({ id: 5, postId: 1, userId: 20, status: JoinStatus.PENDING } as PostJoin);

      await expect(service.joinPost(20, 1)).rejects.toThrow(BadRequestException);
    });

    it('名额已满时即使 requireApproval 也不允许 pending', async () => {
      postRepo.findOne.mockResolvedValue({
        ...recruitingPost,
        joinedCount: 4,
        totalCapacity: 4,
        requireApproval: true,
      });
      joinRepo.findOne.mockResolvedValue(null);

      await expect(service.joinPost(20, 1)).rejects.toThrow(BadRequestException);
      expect(joinRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getPostDetail privacy', () => {
    const detailPost = {
      ...recruitingPost,
      organizer: { nickname: '发起人', avatarUrl: '', level: 1 },
      court: { name: '测试馆', address: '地址', lat: 33, lng: 112 },
      joins: [
        {
          id: 1,
          postId: 1,
          userId: 10,
          status: JoinStatus.APPROVED,
          user: { nickname: '发起人', avatarUrl: 'a', level: 1 },
        },
        {
          id: 2,
          postId: 1,
          userId: 20,
          status: JoinStatus.PENDING,
          user: { nickname: '申请人', avatarUrl: 'b', level: 1 },
        },
      ],
    } as unknown as MatchPost;

    it('非发起人详情看不到 pendingMembers', async () => {
      postRepo.findOne.mockResolvedValue(detailPost);

      const detail = await service.getPostDetail(1, 99);

      expect(detail.pendingMembers).toEqual([]);
      expect(detail.pendingCount).toBe(0);
      expect(detail.members.every((m: { status: string }) => m.status === JoinStatus.APPROVED)).toBe(true);
    });

    it('发起人详情可见 pendingMembers', async () => {
      postRepo.findOne.mockResolvedValue(detailPost);

      const detail = await service.getPostDetail(1, 10);

      expect(detail.pendingMembers).toHaveLength(1);
      expect(detail.pendingMembers[0].userId).toBe(20);
      expect(detail.pendingCount).toBe(1);
    });

    it('已取消帖对路人返回 NotFound', async () => {
      postRepo.findOne.mockResolvedValue({
        ...detailPost,
        status: PostStatus.CANCELLED,
      });

      await expect(service.getPostDetail(1, 99)).rejects.toThrow('约球不存在');
    });

    it('已取消帖发起人仍可查看', async () => {
      postRepo.findOne.mockResolvedValue({
        ...detailPost,
        status: PostStatus.CANCELLED,
      });

      const detail = await service.getPostDetail(1, 10);
      expect(detail.id).toBe('post_1');
    });
  });

  describe('approveJoin', () => {
    it('发起人可通过 pending 申请', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);
      joinRepo.findOne.mockResolvedValue({
        id: 5,
        postId: 1,
        userId: 20,
        status: JoinStatus.PENDING,
      } as PostJoin);

      const result = await service.approveJoin(10, 1, 5);

      expect(result.success).toBe(true);
      expect(joinRepo.manager.transaction).toHaveBeenCalled();
    });

    it('非发起人审批抛出 ForbiddenException', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);

      await expect(service.approveJoin(99, 1, 5)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejectJoin', () => {
    it('拒绝 pending 申请，不占名额', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);
      const pendingJoin = {
        id: 5,
        postId: 1,
        userId: 20,
        status: JoinStatus.PENDING,
      } as PostJoin;
      joinRepo.findOne.mockResolvedValue(pendingJoin);

      await service.rejectJoin(10, 1, 5);

      expect(joinRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: JoinStatus.REJECTED }),
      );
      expect(joinRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('leavePost', () => {
    it('pending 时取消申请', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);
      const pendingJoin = { id: 5, postId: 1, userId: 20, status: JoinStatus.PENDING } as PostJoin;
      joinRepo.findOne.mockResolvedValue(pendingJoin);

      const result = await service.leavePost(20, 1);

      expect(joinRepo.remove).toHaveBeenCalledWith(pendingJoin);
      expect(result.message).toContain('取消');
    });

    it('approved 时退出并减少名额', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);
      joinRepo.findOne.mockResolvedValue({
        id: 5,
        postId: 1,
        userId: 20,
        status: JoinStatus.APPROVED,
      } as PostJoin);

      const result = await service.leavePost(20, 1);

      expect(joinRepo.manager.transaction).toHaveBeenCalled();
      expect(result.message).toContain('退出');
    });

    it('发起人不能退出', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);

      await expect(service.leavePost(10, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePost', () => {
    it('发起人删除约球，状态变为 cancelled', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);

      await service.deletePost(10, 1);

      expect(postRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostStatus.CANCELLED }),
      );
    });

    it('非发起人删除抛出 ForbiddenException', async () => {
      postRepo.findOne.mockResolvedValue(recruitingPost);

      await expect(service.deletePost(99, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
