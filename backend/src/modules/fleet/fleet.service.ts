import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FleetRepository } from './fleet.repository';
import { JobsService } from '../jobs/jobs.service';
import { AppsService } from '../apps/apps.service';
import { TemplatesService } from '../templates/templates.service';
import { FLEET_ERROR_CODES, FLEET_ERRORS } from '../../config/errors/fleet-error-code';
import { JOB_ERROR_CODES } from '../../config/errors/job-error-code';

@Injectable()
export class FleetService {
    constructor(
        private readonly repo: FleetRepository,
        private readonly jobsService: JobsService,
        private readonly appsService: AppsService,
        private readonly templatesService: TemplatesService,
    ) {}

    /**
     * `appIds`'dan foydalanuvchiga tegishli bo'lmaganlarini jimgina
     * chetlab o'tadi (DeviceSelector frontend'da ownership'ni allaqachon
     * hisobga oladi — bu yerdagi filtr faqat ikkinchi xavfsizlik qatlami,
     * boshqa userning device'iga job yubormaslik uchun).
     *
     * Har bir device uchun `JobsService.enqueue` mavjud mantiqni qayta
     * ishlatadi (template/action validatsiyasi, online tekshiruvi,
     * dispatch) — shu bilan "bitta device'ga job yuborish" va "fleet"
     * bir xil yo'ldan o'tadi, ikkita alohida ijro yo'li paydo bo'lmaydi.
     * Bitta device muvaffaqiyatsiz bo'lsa (offline yoki boshqa xato)
     * qolganlariga ta'sir qilmaydi — har biri mustaqil try/catch'da.
     */
    async createRun(
        userId: string,
        templateSlug: string,
        action: string,
        args: Record<string, unknown>,
        appIds: string[],
        deviceFilter: Record<string, unknown> = {},
    ) {
        if (appIds.length === 0) {
            throw new BadRequestException({ code: FLEET_ERROR_CODES.NO_TARGETS, message: FLEET_ERRORS[FLEET_ERROR_CODES.NO_TARGETS] });
        }
        if (appIds.length > 1000) {
            throw new BadRequestException({ code: FLEET_ERROR_CODES.TOO_MANY_TARGETS, message: FLEET_ERRORS[FLEET_ERROR_CODES.TOO_MANY_TARGETS] });
        }

        // findBySlug o'zi TEMPLATE_NOT_FOUND bilan throw qiladi — run
        // yaratishdan oldin bitta marta tekshirib olamiz (har device uchun
        // takror qilinsa ham xato bo'lmaydi, lekin shu yerda erta va aniq
        // signal beradi).
        const template = await this.templatesService.findBySlug(templateSlug);
        if (!template.actions.includes(action)) {
            throw new BadRequestException({
                code: JOB_ERROR_CODES.ACTION_NOT_FOUND,
                message: `Ushbu template uchun bunday action mavjud emas: "${action}"`,
            });
        }

        const myApps = await this.appsService.findAllForUser(userId);
        const myAppIds = new Set(myApps.map((a) => a.id));
        const targetIds = appIds.filter((id) => myAppIds.has(id));

        const run = await this.repo.createRun(template.id, action, args, deviceFilter, userId);

        // Ketma-ket emas, parallel dispatch qilamiz — 1000 ta device'ni
        // navbatma-navbat kutish progress'ni sun'iy sekinlashtiradi;
        // har bir dispatch mustaqil bo'lgani uchun parallel xavfsiz.
        await Promise.all(
            targetIds.map(async (appId) => {
                try {
                    const job = await this.jobsService.enqueue(templateSlug, action, args, appId);
                    await this.repo.addTarget(run.id, appId, job.id, 'dispatched', null);
                } catch (e: any) {
                    const isOffline = e?.response?.code === JOB_ERROR_CODES.DEVICE_OFFLINE;
                    await this.repo.addTarget(run.id, appId, null, isOffline ? 'offline' : 'error', e?.message ?? 'Unknown error');
                }
            }),
        );

        return this.getRunStatus(run.id);
    }

    async listForUser(userId: string) {
        return this.repo.findRunsForUser(userId);
    }

    async getRunStatus(id: string) {
        const run = await this.repo.findRunById(id);
        if (!run) {
            throw new NotFoundException({ code: FLEET_ERROR_CODES.NOT_FOUND, message: FLEET_ERRORS[FLEET_ERROR_CODES.NOT_FOUND] });
        }
        const targets = await this.repo.findTargetsWithStatus(id);

        const summary = { total: targets.length, success: 0, failed: 0, offline: 0, error: 0, running: 0, pending: 0 };
        const enriched = targets.map((t) => {
            const effectiveStatus = t.dispatch_status !== 'dispatched' ? t.dispatch_status : t.job_status ?? 'pending';
            if (effectiveStatus in summary) (summary as any)[effectiveStatus]++;
            return {
                appId: t.app_id,
                appName: t.app_name,
                jobId: t.job_id,
                status: effectiveStatus,
                exitCode: t.exit_code,
                error: t.error,
            };
        });

        const inProgress = summary.running + summary.pending;
        return {
            ...run,
            targets: enriched,
            summary,
            done: inProgress === 0,
        };
    }
}
