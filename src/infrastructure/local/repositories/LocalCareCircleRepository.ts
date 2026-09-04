import {
  CareCircleSchema,
  CircleMemberSchema,
  MemberPermissionSchema,
  type CareCircle,
  type CircleMember,
  type MemberPermission,
} from "../../../domain/entities/careCircle";
import type { CareCircleRepository } from "../../../application/ports/repositories";
import type { KeyValueStore } from "../KeyValueStore";
import { LocalCollection } from "../LocalCollection";

export class LocalCareCircleRepository implements CareCircleRepository {
  private readonly circles: LocalCollection<CareCircle>;
  private readonly members: LocalCollection<CircleMember>;
  private readonly permissions: LocalCollection<MemberPermission>;

  constructor(store: KeyValueStore) {
    this.circles = new LocalCollection(store, "umeed.care_circles", CareCircleSchema, 1);
    this.members = new LocalCollection(store, "umeed.circle_members", CircleMemberSchema, 1);
    this.permissions = new LocalCollection(
      store,
      "umeed.member_permissions",
      MemberPermissionSchema,
      1,
    );
  }

  async findById(id: string): Promise<CareCircle | null> {
    return this.circles.findById(id);
  }

  async findByUserId(userId: string): Promise<CareCircle[]> {
    const memberCircleIds = new Set(
      this.members
        .all()
        .filter((m) => m.userId === userId && m.membershipStatus === "active")
        .map((m) => m.careCircleId),
    );
    return this.circles.all().filter((c) => memberCircleIds.has(c.id));
  }

  async findAllActive(): Promise<CareCircle[]> {
    return this.circles.all().filter((c) => c.status === "active");
  }

  async save(circle: CareCircle): Promise<void> {
    this.circles.save(circle);
  }

  async findMembers(careCircleId: string): Promise<CircleMember[]> {
    return this.members.all().filter((m) => m.careCircleId === careCircleId);
  }

  async findMemberById(id: string): Promise<CircleMember | null> {
    return this.members.findById(id);
  }

  async findMemberByUserAndCircle(
    userId: string,
    careCircleId: string,
  ): Promise<CircleMember | null> {
    return (
      this.members.all().find((m) => m.userId === userId && m.careCircleId === careCircleId) ?? null
    );
  }

  async saveMember(member: CircleMember): Promise<void> {
    this.members.save(member);
  }

  async findPermission(circleMemberId: string): Promise<MemberPermission | null> {
    return this.permissions.all().find((p) => p.circleMemberId === circleMemberId) ?? null;
  }

  async savePermission(permission: MemberPermission): Promise<void> {
    this.permissions.save(permission);
  }
}
