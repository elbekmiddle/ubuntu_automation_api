import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FleetRunsRepository } from './fleet-runs.repository';
import { TemplatesService } from '../templates/templates.service';
import { AppsService } from '../apps/apps.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateFleetRunDTO } from './dto/create-fleet-run.dto';
import { FleetRunTargetStatus, FleetRunWithTargets } from './fleet-runs.types';

const TERMINAL_STATUSES: FleetRunTargetStatus[] = [
  'success',
  'failed',
  'offline',
  'error',
];

@Injectable()
export class FleetRunsService {
  private readonly logger = new Logger(FleetRunsService.name);

  constructor(
    private readonly repo: FleetRunsRepository,
    private readonly templatesService: TemplatesService,
    private readonly appsService: AppsService,
    private readonly jobsService: JobsService,
  ) {}

  async create(
    userId: string,
    dto: CreateFleetRunDTO,
  ): Promise<FleetRunWithTargets> {
    const template = await this.templatesService.findBySlug(dto.templateSlug);
    if (!template.actions.includes(dto.action)) {
      throw new BadRequestException(
        `Template "${dto.templateSlug}" has no action "${dto.action}"`,
      );
    }

    // Faqat shu userga tegishli, so'ralgan ID'lardagi device'lar —
    // boshqa userning device'ini yozib ko'rishga urinish shu yerda
    // jimgina filtrlanadi (xato tashlanmaydi, chunki frontend'da
    // ko'plab ID yuboriladi va bittasi noto'g'ri bo'lsa ham qolganlar
    // ishlashi kerak).
    const allApps = await this.appsService.findAllForUser(userId);
    const wanted = new Set(dto.targetAppIds);
    const targetApps = allApps.filter((a) => wanted.has(a.id));

    if (targetApps.length === 0) {
      throw new BadRequestException('No valid target devices found');
    }

    const targetSeeds: Array<{
      appId: string;
      appName: string;
      status: FleetRunTargetStatus;
    }> = targetApps.map((a) => ({
      appId: a.id,
      appName: a.name,
      status: a.status === 'online' ? 'pending' : 'offline',
    }));

    const run = await this.repo.createWithTargets(
      userId,
      template.id,
      template.slug,
      dto.action,
      dto.args ?? {},
      targetSeeds,
    );

    this.logger.log(
      `Fleet run ${run.id} created: ${template.slug}/${dto.action} on ${targetSeeds.length} targets (${targetSeeds.filter((t) => t.status === 'pending').length} online)`,
    );

    // Online target'lar uchun — mavjud bitta-device job yaratish
    // yo'lini (agent routing, offline tekshiruvi va h.k. bilan birga)
    // qayta ishlatamiz, xatti-harakat bitta device'da ishga tushirish
    // bilan bir xil bo'lsin.
    await Promise.all(
      run.targets
        .filter((t) => t.status === 'pending')
        .map(async (t) => {
          try {
            const job = await this.jobsService.enqueue(
              template.slug,
              dto.action,
              dto.args ?? {},
              t.app_id,
            );
            await this.repo.attachJob(t.id, job.id, job.status);
          } catch (err) {
            await this.repo.markTargetError(
              t.id,
              (err as Error).message ?? 'Failed to enqueue job',
            );
          }
        }),
    );

    const finalRun = await this.repo.findOneForUser(userId, run.id);
    if (!finalRun) {
      // Amalda bo'lmaydi — shu zahoti yaratdik — lekin tur xavfsizligi uchun.
      throw new NotFoundException('Fleet run not found after creation');
    }
    await this.maybeMarkCompleted(finalRun);
    return finalRun;
  }

  async findAllForUser(userId: string, page: number, limit: number) {
    return this.repo.findAllForUser(userId, page, limit);
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<FleetRunWithTargets> {
    const run = await this.repo.findOneForUser(userId, id);
    if (!run) {
      throw new NotFoundException(`Fleet run "${id}" not found`);
    }

    // Alohida background poller/worker o'rniga — sahifa har safar
    // shu endpoint'ni chaqirganda (frontend 2s'da bir marta poll
    // qiladi), tegishli job'larning eng so'nggi statusini shu yerda
    // sinxronlaymiz. Kam trafikli fleet run tarixi uchun bu yetarli
    // va alohida cron/worker infratuzilmasi kerak emas.
    const synced = await this.repo.syncTargetStatusesFromJobs(run.targets);
    const withSynced = { ...run, targets: synced };
    await this.maybeMarkCompleted(withSynced);
    return withSynced;
  }

  private async maybeMarkCompleted(run: FleetRunWithTargets) {
    if (run.status === 'completed') return;
    const allTerminal = run.targets.every((t) =>
      TERMINAL_STATUSES.includes(t.status),
    );
    if (allTerminal && run.targets.length > 0) {
      await this.repo.markCompleted(run.id);
      run.status = 'completed';
      run.completed_at = new Date();
    }
  }
}
