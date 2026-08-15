export interface CreateJobDTO {
    templateSlug: string;
    action: string;
    args?: Record<string, unknown>;
}
