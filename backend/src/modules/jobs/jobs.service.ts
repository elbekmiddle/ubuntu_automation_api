import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsRepository } from './jobs.repository';
import { TemplatesService } from '../templates/templates.service';
import { JobQueuePayload } from './jobs.types';
import {
  JOB_ERROR_CODES,
  JOB_ERRORS,
} from '../../config/errors/job-error-code';
import { AppsService } from '../apps/apps.service';
import { AgentsGateway } from '../apps/agents.gateway';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly jobsRepo: JobsRepository,
    private readonly templatesService: TemplatesService,
    @InjectQueue('script-execution')
    private readonly queue: Queue<JobQueuePayload>,
    @Inject(forwardRef(() => AppsService))
    private readonly appsService: AppsService,
    @Inject(forwardRef(() => AgentsGateway))
    private readonly agentsGateway: AgentsGateway,
  ) {}

  async enqueue(
    templateSlug: string,
    action: string,
    args: Record<string, unknown> = {},
    appId: string | null | undefined,
    // `schedules` (cron orqali BullMQ worker'ida ishga tushadigan)
    // hali user/tashkilot konsepsiyasiga ega emas (ScheduleTriggerProcessor'ga
    // qarang — bu alohida, org tizimidan oldingi subsystem, uni ham
    // migratsiya qilish alohida vazifa). Shuning uchun bu yerda userId
    // ixtiyoriy: HTTP orqali (JobsController/FleetRunsService) doim
    // beriladi, faqat schedule-trigger'dan kelganda `null` bo'ladi va
    // natijada bunday job'lar hech kimning shaxsiy ro'yxatida
    // ko'rinmaydi (avvalgidek — bu YANGI cheklov emas, chunki oldin
    // schedules'ning o'zi ham hech qanday egaga bog'lanmagan edi).
    userId: string | null,
  ) {
    if (!templateSlug?.trim()) {
      throw new BadRequestException({
        code: JOB_ERROR_CODES.TEMPLATE_SLUG_REQUIRED,
        message: JOB_ERRORS[JOB_ERROR_CODES.TEMPLATE_SLUG_REQUIRED],
      });
    }

    if (!action?.trim()) {
      throw new BadRequestException({
        code: JOB_ERROR_CODES.ACTION_REQUIRED,
        message: JOB_ERRORS[JOB_ERROR_CODES.ACTION_REQUIRED],
      });
    }

    // findBySlug already throws TEMPLATE_NOT_FOUND with the right code
    const template = await this.templatesService.findBySlug(templateSlug);

    if (!template.actions.includes(action)) {
      throw new NotFoundException({
        code: JOB_ERROR_CODES.ACTION_NOT_FOUND,
        message: `${JOB_ERRORS[JOB_ERROR_CODES.ACTION_NOT_FOUND]}: "${action}"`,
      });
    }

    // appId berilgan bo'lsa — job Agent orqali (masofaviy mashinada) ishlaydi.
    // Bo'lmasa — avvalgidek, backend'ning o'zida (BullMQ + local spawn).
    if (appId) {
      if (!userId) {
        // Amalda bo'lmasligi kerak (hozircha faqat schedule-trigger
        // `userId=null` bilan chaqiradi, u esa hech qachon appId
        // bermaydi) — lekin tur xavfsizligi va kelajakdagi xatolarni
        // ushlash uchun aniq xabar bilan to'xtatamiz.
        throw new BadRequestException(
          'A device-targeted job requires an authenticated user',
        );
      }
      return this.enqueueRemote(
        template.id,
        template.slug,
        action,
        args,
        appId,
        userId,
      );
    }

    try {
      // Local (backend'ning o'zida ishlaydigan) job — hech qanday
      // device'ga bog'liq emas, shuning uchun organization_id yo'q,
      // faqat kim ishga tushirganini bilamiz (user_id).
      const job = await this.jobsRepo.create(
        template.id,
        action,
        args,
        null,
        userId,
        null,
      );

      await this.queue.add('run-script', {
        jobId: job.id,
        templatePath: template.path,
        action,
        args,
      });

      this.logger.log(
        `Enqueued job ${job.id} (${template.slug} -> ${action}) [local]`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue job for "${templateSlug}" -> "${action}"`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new HttpException(
        {
          code: JOB_ERROR_CODES.ENQUEUE_FAILED,
          message: JOB_ERRORS[JOB_ERROR_CODES.ENQUEUE_FAILED],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async enqueueRemote(
    templateId: string,
    templateSlug: string,
    action: string,
    args: Record<string, unknown>,
    appId: string,
    userId: string,
  ) {
    // `findByIdInternal` o'rniga user-scoped `findOneForUser` ishlatamiz —
    // bu ikki narsani bir yo'la beradi: (1) device mavjudligini
    // tekshiradi, (2) SHU USER haqiqatan shu device'ga (o'zi yaratgan
    // yoki uning tashkilotiga tegishli) ega ekanini tekshiradi. Ilgari
    // bu tekshiruv umuman yo'q edi — istalgan userga tegishli appId
    // berib, boshqa birovning device'ida job ishga tushirish mumkin edi.
    const app = await this.appsService
      .findOneForUser(userId, appId)
      .catch(() => null);
    if (!app) {
      throw new NotFoundException({
        code: JOB_ERROR_CODES.DEVICE_NOT_FOUND,
        message: JOB_ERRORS[JOB_ERROR_CODES.DEVICE_NOT_FOUND],
      });
    }
    if (app.status !== 'online' || !this.agentsGateway.isAppConnected(appId)) {
      throw new BadRequestException({
        code: JOB_ERROR_CODES.DEVICE_OFFLINE,
        message: JOB_ERRORS[JOB_ERROR_CODES.DEVICE_OFFLINE],
      });
    }

    try {
      const script = await this.templatesService.getActionScript(
        templateId,
        action,
      );
      const job = await this.jobsRepo.create(
        templateId,
        action,
        args,
        appId,
        userId,
        app.organization_id,
      );
      await this.jobsRepo.markDispatched(job.id);

      this.agentsGateway.dispatchJob(appId, {
        jobId: job.id,
        action,
        script,
        args,
      });
      this.logger.log(
        `Enqueued job ${job.id} (${templateSlug} -> ${action}) [remote -> app=${appId}]`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to dispatch remote job for "${templateSlug}" -> "${action}" on app ${appId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new HttpException(
        {
          code: JOB_ERROR_CODES.ENQUEUE_FAILED,
          message: JOB_ERRORS[JOB_ERROR_CODES.ENQUEUE_FAILED],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(userId: string, page = 1, pageSize = 10) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100); // 100 tadan oshmasin — DoS himoyasi
    const offset = (safePage - 1) * safePageSize;

    const [data, total] = await Promise.all([
      this.jobsRepo.findAllForUser(userId, safePageSize, offset),
      this.jobsRepo.countForUser(userId),
    ]);

    return {
      data,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async findOne(userId: string, id: string) {
    const job = await this.jobsRepo.findByIdForUser(userId, id);
    if (!job) {
      throw new NotFoundException({
        code: JOB_ERROR_CODES.NOT_FOUND,
        message: `${JOB_ERRORS[JOB_ERROR_CODES.NOT_FOUND]}: "${id}"`,
      });
    }
    return job;
  }

  async findLogs(userId: string, id: string) {
    // Ensure the job is visible to this user before returning (possibly empty) logs
    await this.findOne(userId, id);
    return this.jobsRepo.findLogs(id);
  }
}
