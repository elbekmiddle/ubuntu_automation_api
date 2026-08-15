export interface CreateTemplateDTO {
    slug: string;
    name: string;
    description: string;
    actions: {name: string, script: string} [];
}