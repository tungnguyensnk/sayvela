import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ContextsRepository } from './contexts.repository';
import { CreateContextDto, UpdateContextDto } from './dto/contexts.dto';

const MAX_CONTEXT_CHARS = 10_000;

// enforces business rules for context objects and delegates to repository
@Injectable()
export class ContextsService {
  constructor(private repo: ContextsRepository) {}

  // validates soniox context payload doesn't exceed 10k char limit
  private validate(contextJson: Record<string, unknown>) {
    const serialized = JSON.stringify(contextJson);
    if (serialized.length > MAX_CONTEXT_CHARS) {
      throw new HttpException(
        `context_json exceeds ${MAX_CONTEXT_CHARS} characters — trim or summarize`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async list(userId: string) {
    return this.repo.findAllByUser(userId);
  }

  async create(userId: string, dto: CreateContextDto) {
    this.validate(dto.contextJson as Record<string, unknown>);
    return this.repo.create(
      userId,
      dto.name,
      dto.description,
      dto.contextJson as Record<string, unknown>,
    );
  }

  async getOne(userId: string, id: string) {
    const row = await this.repo.findByIdAndUser(id, userId);
    if (!row) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    return row;
  }

  async update(userId: string, id: string, dto: UpdateContextDto) {
    const existing = await this.repo.findByIdAndUser(id, userId);
    if (!existing) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    const contextJson = dto.contextJson as Record<string, unknown> | undefined;
    if (contextJson) this.validate(contextJson);
    await this.repo.update(id, {
      name: dto.name,
      description: dto.description,
      contextJson,
    });
    return this.repo.findByIdAndUser(id, userId);
  }

  async remove(userId: string, id: string) {
    const existing = await this.repo.findByIdAndUser(id, userId);
    if (!existing) throw new HttpException('not found', HttpStatus.NOT_FOUND);
    await this.repo.remove(id);
  }
}
